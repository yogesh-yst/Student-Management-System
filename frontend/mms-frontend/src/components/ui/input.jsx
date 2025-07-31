import React from 'react';

const Input = ({ id, type, value, onChange, placeholder, className, disabled }) => {
    return (
        <input
            id={id}
            type={type}
            value={value}
            onChange={onChange}
            placeholder={placeholder}
            className={`py-2 px-4 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${className}`}
            disabled={disabled}
        />
    );
};

export default Input;