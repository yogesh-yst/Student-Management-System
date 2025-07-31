import React from 'react';

export const Button = ({ onClick, className, disabled, children }) => {
    return (
        <button
            onClick={onClick}
            className={`py-2 px-4 rounded-md font-semibold text-white bg-blue-500 hover:bg-blue-600 disabled:bg-gray-400 ${className}`}
            disabled={disabled}
        >
            {children}
        </button>
    );
};