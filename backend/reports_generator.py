import io
import os
import uuid
from datetime import datetime, timedelta
from reportlab.lib import colors
from reportlab.lib.pagesizes import letter, A4
from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch
import pandas as pd
from flask import send_file
import tempfile

class ReportGenerator:
    def __init__(self, db_collections):
        self.attendance_collection = db_collections['attendance']
        self.member_collection = db_collections['member']
        self.generated_reports_collection = db_collections['generated_reports']
    
    def generate_attendance_summary(self, parameters):
        """Generate attendance summary report"""
        start_date = datetime.strptime(parameters['start_date'], '%Y-%m-%d')
        end_date = datetime.strptime(parameters['end_date'], '%Y-%m-%d')
        grade_filter = parameters.get('grade')
        
        # Query attendance data
        query = {
            "timestamp": {
                "$gte": start_date,
                "$lte": end_date.replace(hour=23, minute=59, second=59)
            }
        }
        
        attendance_records = list(self.attendance_collection.find(query))
        
        # Get student details
        student_ids = [record['student_id'] for record in attendance_records]
        members_query = {"student_id": {"$in": student_ids}}
        if grade_filter and grade_filter != 'All':
            members_query["grade"] = grade_filter
            
        members = list(self.member_collection.find(members_query))
        member_dict = {m['student_id']: m for m in members}
        
        # Process data
        attendance_data = []
        for record in attendance_records:
            student_id = record['student_id']
            if student_id in member_dict:
                member = member_dict[student_id]
                attendance_data.append({
                    'student_id': student_id,
                    'name': member['name'],
                    'grade': member['grade'],
                    'date': record['timestamp'].strftime('%Y-%m-%d'),
                    'time': record['timestamp'].strftime('%H:%M:%S')
                })
        
        return {
            'title': f'Attendance Summary ({start_date.strftime("%Y-%m-%d")} to {end_date.strftime("%Y-%m-%d")})',
            'data': attendance_data,
            'summary': {
                'total_records': len(attendance_data),
                'unique_students': len(set(r['student_id'] for r in attendance_data)),
                'date_range': f"{start_date.strftime('%Y-%m-%d')} to {end_date.strftime('%Y-%m-%d')}"
            }
        }
    
    def generate_student_roster(self, parameters):
        """Generate student roster report"""
        status_filter = parameters.get('status', 'All')
        grade_filter = parameters.get('grade', 'All')
        include_contact = parameters.get('include_contact', True)
        
        # Build query
        query = {}
        if status_filter != 'All':
            query['status'] = status_filter
        if grade_filter != 'All':
            query['grade'] = grade_filter
            
        # Get student data
        members = list(self.member_collection.find(query).sort('grade', 1).sort('name', 1))
        
        # Process data
        roster_data = []
        for member in members:
            student_data = {
                'student_id': member['student_id'],
                'name': member['name'],
                'grade': member['grade'],
                'status': member['status']
            }
            
            if include_contact:
                student_data.update({
                    'parent_name': member.get('parent_name', ''),
                    'contact': member.get('contact', ''),
                    'email': member.get('email', '')
                })
            
            roster_data.append(student_data)
        
        return {
            'title': f'Student Roster Report',
            'data': roster_data,
            'summary': {
                'total_students': len(roster_data),
                'filters': {
                    'status': status_filter,
                    'grade': grade_filter,
                    'include_contact': include_contact
                }
            }
        }
    
    def generate_daily_attendance(self, parameters):
        """Generate daily attendance report"""
        target_date = datetime.strptime(parameters['date'], '%Y-%m-%d')
        start_of_day = target_date.replace(hour=0, minute=0, second=0)
        end_of_day = target_date.replace(hour=23, minute=59, second=59)
        
        # Query attendance for the day
        attendance_records = list(self.attendance_collection.find({
            "timestamp": {"$gte": start_of_day, "$lte": end_of_day}
        }).sort('timestamp', 1))
        
        # Get all active students for comparison
        all_students = list(self.member_collection.find(
            {"status": "Active"}, 
            {"student_id": 1, "name": 1, "grade": 1}
        ).sort('grade', 1).sort('name', 1))
        
        # Create attendance data
        present_students = {r['student_id']: r for r in attendance_records}
        daily_data = []
        
        for student in all_students:
            student_id = student['student_id']
            attendance_record = present_students.get(student_id)
            
            daily_data.append({
                'student_id': student_id,
                'name': student['name'],
                'grade': student['grade'],
                'status': 'Present' if attendance_record else 'Absent',
                'check_in_time': attendance_record['timestamp'].strftime('%H:%M:%S') if attendance_record else ''
            })
        
        return {
            'title': f'Daily Attendance Report - {target_date.strftime("%Y-%m-%d")}',
            'data': daily_data,
            'summary': {
                'date': target_date.strftime('%Y-%m-%d'),
                'total_students': len(all_students),
                'present': len(attendance_records),
                'absent': len(all_students) - len(attendance_records),
                'attendance_rate': f"{(len(attendance_records) / len(all_students) * 100):.1f}%" if all_students else "0%"
            }
        }

def create_pdf_report(report_data, output_format='PDF'):
    """Create PDF report from report data"""
    buffer = io.BytesIO()
    
    # Create PDF document
    doc = SimpleDocTemplate(buffer, pagesize=letter, topMargin=0.5*inch)
    styles = getSampleStyleSheet()
    story = []
    
    # Title
    title_style = ParagraphStyle(
        'CustomTitle',
        parent=styles['Heading1'],
        fontSize=16,
        spaceAfter=30,
        alignment=1  # Center alignment
    )
    story.append(Paragraph(report_data['title'], title_style))
    story.append(Spacer(1, 20))
    
    # Summary section
    if 'summary' in report_data:
        summary_style = styles['Heading2']
        story.append(Paragraph("Summary", summary_style))
        
        for key, value in report_data['summary'].items():
            if isinstance(value, dict):
                story.append(Paragraph(f"<b>{key.replace('_', ' ').title()}:</b>", styles['Normal']))
                for sub_key, sub_value in value.items():
                    story.append(Paragraph(f"  • {sub_key.replace('_', ' ').title()}: {sub_value}", styles['Normal']))
            else:
                story.append(Paragraph(f"<b>{key.replace('_', ' ').title()}:</b> {value}", styles['Normal']))
        
        story.append(Spacer(1, 20))
    
    # Data table
    if report_data['data']:
        story.append(Paragraph("Detailed Data", styles['Heading2']))
        story.append(Spacer(1, 10))
        
        # Create table data
        if report_data['data']:
            headers = list(report_data['data'][0].keys())
            table_data = [headers]
            
            for row in report_data['data']:
                table_data.append([str(row.get(header, '')) for header in headers])
            
            # Create table
            table = Table(table_data)
            table.setStyle(TableStyle([
                ('BACKGROUND', (0, 0), (-1, 0), colors.grey),
                ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
                ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
                ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
                ('FONTSIZE', (0, 0), (-1, 0), 12),
                ('BOTTOMPADDING', (0, 0), (-1, 0), 12),
                ('BACKGROUND', (0, 1), (-1, -1), colors.beige),
                ('GRID', (0, 0), (-1, -1), 1, colors.black),
                ('FONTNAME', (0, 1), (-1, -1), 'Helvetica'),
                ('FONTSIZE', (0, 1), (-1, -1), 10),
            ]))
            
            story.append(table)
    
    # Build PDF
    doc.build(story)
    buffer.seek(0)
    return buffer

def create_excel_report(report_data):
    """Create Excel report from report data"""
    buffer = io.BytesIO()
    
    with pd.ExcelWriter(buffer, engine='openpyxl') as writer:
        # Create main data sheet
        if report_data['data']:
            df = pd.DataFrame(report_data['data'])
            df.to_excel(writer, sheet_name='Data', index=False)
        
        # Create summary sheet
        if 'summary' in report_data:
            summary_data = []
            for key, value in report_data['summary'].items():
                if isinstance(value, dict):
                    for sub_key, sub_value in value.items():
                        summary_data.append({
                            'Category': key.replace('_', ' ').title(),
                            'Metric': sub_key.replace('_', ' ').title(),
                            'Value': str(sub_value)
                        })
                else:
                    summary_data.append({
                        'Category': 'General',
                        'Metric': key.replace('_', ' ').title(),
                        'Value': str(value)
                    })
            
            summary_df = pd.DataFrame(summary_data)
            summary_df.to_excel(writer, sheet_name='Summary', index=False)
    
    buffer.seek(0)
    return buffer

def create_report_generator(attendance_collection, member_collection, generated_reports_collection):
    """Create and return a ReportGenerator instance with the provided collections"""
    return ReportGenerator({
        'attendance': attendance_collection,
        'member': member_collection,
        'generated_reports': generated_reports_collection
    })