'use client';

import React, { useState } from 'react';
import { RecordPaymentRequest } from '../types/payment';

interface RecordPaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (paymentData: RecordPaymentRequest) => Promise<void>;
  isLoading: boolean;
}

const paymentMethods = [
  { value: 'BANK_TRANSFER', label: 'Bank Transfer' },
  { value: 'CASH', label: 'Cash' },
  { value: 'CARD', label: 'Card' },
  { value: 'CHEQUE', label: 'Cheque' },
];

export default function RecordPaymentModal({ isOpen, onClose, onSubmit, isLoading }: RecordPaymentModalProps) {
  const [formData, setFormData] = useState<RecordPaymentRequest>({
    amount: 0,
    method: 'BANK_TRANSFER',
    paidAt: new Date().toISOString().split('T')[0] + 'T00:00:00.000Z',
    note: '',
  });

  const [errors, setErrors] = useState<{ [key: string]: string }>({});

  const validateForm = () => {
    const newErrors: { [key: string]: string } = {};

    if (!formData.amount || formData.amount <= 0) {
      newErrors.amount = 'Amount must be greater than 0';
    }

    if (!formData.method) {
      newErrors.method = 'Payment method is required';
    }

    if (!formData.paidAt) {
      newErrors.paidAt = 'Payment date is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    try {
      await onSubmit(formData);
      // Reset form on successful submission
      setFormData({
        amount: 0,
        method: 'BANK_TRANSFER',
        paidAt: new Date().toISOString().split('T')[0] + 'T00:00:00.000Z',
        note: '',
      });
      setErrors({});
    } catch (error) {
      console.error('Error submitting payment:', error);
    }
  };

  const handleInputChange = (field: keyof RecordPaymentRequest, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const handleDateChange = (dateString: string) => {
    // Convert date string to ISO format
    const isoDate = new Date(dateString).toISOString();
    handleInputChange('paidAt', isoDate);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold text-gray-900">Record Payment</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
            disabled={isLoading}
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Amount Field */}
          <div>
            <label htmlFor="amount" className="block text-sm font-medium text-gray-700 mb-1">
              Amount *
            </label>
            <input
              type="number"
              id="amount"
              step="0.01"
              min="0"
              value={formData.amount || ''}
              onChange={(e) => handleInputChange('amount', parseFloat(e.target.value) || 0)}
              className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                errors.amount ? 'border-red-500' : 'border-gray-300'
              }`}
              placeholder="Enter payment amount"
              disabled={isLoading}
            />
            {errors.amount && <p className="text-red-500 text-sm mt-1">{errors.amount}</p>}
          </div>

          {/* Payment Method Field */}
          <div>
            <label htmlFor="method" className="block text-sm font-medium text-gray-700 mb-1">
              Payment Method *
            </label>
            <select
              id="method"
              value={formData.method}
              onChange={(e) => handleInputChange('method', e.target.value as RecordPaymentRequest['method'])}
              className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                errors.method ? 'border-red-500' : 'border-gray-300'
              }`}
              disabled={isLoading}
            >
              {paymentMethods.map((method) => (
                <option key={method.value} value={method.value}>
                  {method.label}
                </option>
              ))}
            </select>
            {errors.method && <p className="text-red-500 text-sm mt-1">{errors.method}</p>}
          </div>

          {/* Payment Date Field */}
          <div>
            <label htmlFor="paidAt" className="block text-sm font-medium text-gray-700 mb-1">
              Payment Date *
            </label>
            <input
              type="date"
              id="paidAt"
              value={formData.paidAt ? formData.paidAt.split('T')[0] : ''}
              onChange={(e) => handleDateChange(e.target.value)}
              className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                errors.paidAt ? 'border-red-500' : 'border-gray-300'
              }`}
              disabled={isLoading}
            />
            {errors.paidAt && <p className="text-red-500 text-sm mt-1">{errors.paidAt}</p>}
          </div>

          {/* Note Field */}
          <div>
            <label htmlFor="note" className="block text-sm font-medium text-gray-700 mb-1">
              Note (Optional)
            </label>
            <textarea
              id="note"
              rows={3}
              value={formData.note || ''}
              onChange={(e) => handleInputChange('note', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Add a note about this payment..."
              disabled={isLoading}
            />
          </div>

          {/* Action Buttons */}
          <div className="flex space-x-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-500"
              disabled={isLoading}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Recording...
                </>
              ) : (
                'Record Payment'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}