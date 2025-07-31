import React from 'react';

export const Alert = ({ variant = 'default', children, className }) => {
    const variantClasses = {
        default: 'bg-blue-100 text-blue-800 border-blue-200',
        warning: 'bg-yellow-100 text-yellow-800 border-yellow-200',
        destructive: 'bg-red-100 text-red-800 border-red-200',
    };

    return (
        <div
            className={`p-4 border rounded-md flex items-start space-x-2 ${variantClasses[variant]} ${className}`}
        >
            {children}
        </div>
    );
};

export const AlertTitle = ({ children, className }) => {
    return <h4 className={`font-semibold ${className}`}>{children}</h4>;
};

export const AlertDescription = ({ children, className }) => {
    return <p className={`text-sm ${className}`}>{children}</p>;
};

export default Alert;