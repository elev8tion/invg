import React, { useState } from 'react';
import { X, KeyRound } from 'lucide-react';
import { userService } from './lib/db';
import { isValidPin, normalizePin } from './lib/pin';

const Field = ({ label, value, onChange, autoFocus }) => (
  <label className="block text-left mb-4">
    <span className="block text-sm text-gray-400 mb-2">{label}</span>
    <input
      type="password"
      inputMode="numeric"
      autoComplete="off"
      maxLength={4}
      autoFocus={autoFocus}
      value={value}
      onChange={(e) => onChange(normalizePin(e.target.value))}
      className="w-full p-3 bg-gray-800 border border-gray-700 rounded-xl focus:border-purple-500 focus:outline-none text-white tracking-[0.4em] text-center text-lg"
    />
  </label>
);

const ChangePin = ({ userId, onClose }) => {
  const [currentPin, setCurrentPin] = useState('');
  const [nextPin, setNextPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!isValidPin(currentPin) || !isValidPin(nextPin)) {
      setError('PINs must be 4 digits');
      return;
    }
    if (nextPin !== confirmPin) {
      setError('New PIN and confirmation do not match');
      return;
    }
    if (nextPin === currentPin) {
      setError('Pick a different PIN');
      return;
    }
    setBusy(true);
    try {
      await userService.changePin(userId, currentPin, nextPin);
      onClose();
    } catch (err) {
      setError(err.message || 'Could not change PIN');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-900 rounded-2xl w-full max-w-md border border-gray-800">
        <div className="p-6 flex items-center justify-between border-b border-gray-800">
          <div className="flex items-center gap-3">
            <KeyRound size={20} className="text-purple-400" />
            <h2 className="text-lg font-semibold text-white">Change PIN</h2>
          </div>
          <button type="button" onClick={onClose} className="p-2 hover:bg-gray-800 rounded-lg">
            <X size={18} className="text-gray-400" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-6">
          <Field label="Current PIN" value={currentPin} onChange={setCurrentPin} autoFocus />
          <Field label="New PIN" value={nextPin} onChange={setNextPin} />
          <Field label="Confirm new PIN" value={confirmPin} onChange={setConfirmPin} />
          {error && <p className="text-red-400 text-sm mb-4">{error}</p>}
          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-gray-800 border border-gray-700 rounded-xl hover:bg-gray-700"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={busy}
              className="px-4 py-2 bg-purple-600 rounded-xl hover:bg-purple-500 disabled:opacity-50"
            >
              {busy ? 'Saving...' : 'Save PIN'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ChangePin;
