import React, { useState } from 'react';
import { Delete, Lock } from 'lucide-react';
import { userService } from './lib/db';
import { isValidPin, normalizePin } from './lib/pin';
import { publicUser, writeSession } from './lib/session';

const KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '', '0', 'del'];

const PinLock = ({ onUnlock }) => {
  const [digits, setDigits] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async (pin) => {
    if (busy) return;
    if (!isValidPin(pin)) return;
    setBusy(true);
    setError('');
    try {
      const user = await userService.getUserByPin(pin);
      const active = user && Number(user.is_active) === 1;
      if (!active) {
        setError('PIN not recognized');
        setDigits('');
        return;
      }
      writeSession(user);
      onUnlock(publicUser(user));
    } catch (err) {
      console.error('PIN unlock failed:', err);
      setError('Could not sign in. Try again.');
      setDigits('');
    } finally {
      setBusy(false);
    }
  };

  const press = (key) => {
    if (busy || key === '') return;
    setError('');
    if (key === 'del') {
      setDigits((prev) => prev.slice(0, -1));
      return;
    }
    const next = normalizePin(digits + key);
    setDigits(next);
    if (next.length === 4) submit(next);
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center p-6">
      <div className="w-full max-w-xs text-center">
        <div className="mx-auto mb-6 w-14 h-14 rounded-2xl bg-gray-800 border border-gray-700 flex items-center justify-center">
          <Lock size={24} className="text-purple-400" />
        </div>
        <h1 className="text-xl font-semibold mb-2">Enter PIN</h1>
        <p className="text-sm text-gray-400 mb-8">Four digits to open your account</p>

        <div className="flex justify-center gap-3 mb-4">
          {[0, 1, 2, 3].map((i) => (
            <span
              key={i}
              className={`w-3.5 h-3.5 rounded-full border ${
                digits.length > i ? 'bg-purple-400 border-purple-400' : 'border-gray-600'
              }`}
            />
          ))}
        </div>

        <p className="h-6 text-sm text-red-400 mb-4">{error}</p>

        {/* mobile-keep-grid: a numeric keypad is 3 across at every width.
            Without it the blanket .grid-cols-3 rule in global-responsive-fix.css
            reflows it to two columns between 640px and 1024px. */}
        <div className="grid grid-cols-3 gap-3 mobile-keep-grid">
          {KEYS.map((key, index) => {
            if (key === '') return <span key={`empty-${index}`} />;
            if (key === 'del') {
              return (
                <button
                  key="del"
                  type="button"
                  onClick={() => press('del')}
                  disabled={busy}
                  className="h-16 rounded-2xl bg-gray-800 border border-gray-700 hover:bg-gray-700 flex items-center justify-center disabled:opacity-50"
                >
                  <Delete size={20} className="text-gray-300" />
                </button>
              );
            }
            return (
              <button
                key={key}
                type="button"
                onClick={() => press(key)}
                disabled={busy}
                className="h-16 rounded-2xl bg-gray-800 border border-gray-700 hover:bg-gray-700 text-2xl font-medium disabled:opacity-50"
              >
                {key}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default PinLock;
