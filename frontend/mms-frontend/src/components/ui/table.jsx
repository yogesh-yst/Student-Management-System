import React from 'react';

export const Table = ({ children, className }) => {
    return <table className={`min-w-full border-collapse ${className}`}>{children}</table>;
};

export const TableHeader = ({ children, className }) => {
    return <thead className={`bg-gray-200 ${className}`}>{children}</thead>;
};

export const TableBody = ({ children, className }) => {
    return <tbody className={className}>{children}</tbody>;
};

export const TableRow = ({ children, className }) => {
    return <tr className={`border-b ${className}`}>{children}</tr>;
};

export const TableHead = ({ children, className }) => {
    return <th className={`px-4 py-2 text-left font-medium text-gray-700 ${className}`}>{children}</th>;
};

export const TableCell = ({ children, className }) => {
    return <td className={`px-4 py-2 text-gray-600 ${className}`}>{children}</td>;
};