import React, { useCallback, useEffect, useState } from 'react';
import { X, UserPlus, Users } from 'lucide-react';
import { userService } from './lib/db';
import { isValidPin, normalizePin } from './lib/pin';

const PeopleAdmin = ({ currentUserId, onClose }) => {
  const [people, setPeople] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [fullName, setFullName] = useState('');
  const [pin, setPin] = useState('');
  const [saving, setSaving] = useState(false);
  const [resetFor, setResetFor] = useState(null);
  const [resetPin, setResetPin] = useState('');

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setPeople(await userService.listUsers());
    } catch (err) {
      console.error(err);
      setError('Could not load people');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const handleCreate = async (e) => {
    e.preventDefault();
    setError('');
    if (!fullName.trim()) {
      setError('Name is required');
      return;
    }
    if (!isValidPin(pin)) {
      setError('PIN must be 4 digits');
      return;
    }
    setSaving(true);
    try {
      await userService.createPinUser({ full_name: fullName.trim(), pin_code: pin });
      setFullName('');
      setPin('');
      await load();
    } catch (err) {
      setError(err.message || 'Could not create account');
    } finally {
      setSaving(false);
    }
  };

  const handleDeactivate = async (person) => {
    if (person.id === currentUserId) return;
    if (!window.confirm(`Deactivate ${person.full_name || person.email}? They will not be able to sign in.`)) {
      return;
    }
    try {
      await userService.setActive(person.id, false);
      await load();
    } catch (err) {
      setError(err.message || 'Could not update account');
    }
  };

  const handleActivate = async (person) => {
    try {
      await userService.setActive(person.id, true);
      await load();
    } catch (err) {
      setError(err.message || 'Could not update account');
    }
  };

  const handleReset = async (e) => {
    e.preventDefault();
    if (!resetFor) return;
    if (!isValidPin(resetPin)) {
      setError('PIN must be 4 digits');
      return;
    }
    try {
      await userService.resetPin(resetFor.id, resetPin);
      setResetFor(null);
      setResetPin('');
      setError('');
      await load();
    } catch (err) {
      setError(err.message || 'Could not reset PIN');
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-900 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden border border-gray-800 flex flex-col">
        <div className="p-6 flex items-center justify-between border-b border-gray-800">
          <div className="flex items-center gap-3">
            <Users size={20} className="text-purple-400" />
            <h2 className="text-lg font-semibold text-white">People</h2>
          </div>
          <button type="button" onClick={onClose} className="p-2 hover:bg-gray-800 rounded-lg">
            <X size={18} className="text-gray-400" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto space-y-6">
          <form onSubmit={handleCreate} className="bg-gray-800/50 border border-gray-800 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-4 text-purple-300">
              <UserPlus size={18} />
              <h3 className="font-medium">Add person</h3>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <input
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Full name"
                className="p-3 bg-gray-800 border border-gray-700 rounded-xl focus:border-purple-500 focus:outline-none text-white"
              />
              <input
                type="password"
                inputMode="numeric"
                autoComplete="off"
                maxLength={4}
                value={pin}
                onChange={(e) => setPin(normalizePin(e.target.value))}
                placeholder="4-digit PIN"
                className="p-3 bg-gray-800 border border-gray-700 rounded-xl focus:border-purple-500 focus:outline-none text-white tracking-[0.3em] text-center"
              />
            </div>
            <button
              type="submit"
              disabled={saving}
              className="mt-3 px-4 py-2 bg-purple-600 rounded-xl hover:bg-purple-500 disabled:opacity-50"
            >
              {saving ? 'Creating...' : 'Create account'}
            </button>
          </form>

          {error && <p className="text-red-400 text-sm">{error}</p>}

          {resetFor && (
            <form onSubmit={handleReset} className="bg-gray-800/50 border border-gray-700 rounded-xl p-4">
              <p className="text-sm text-gray-300 mb-3">
                New PIN for {resetFor.full_name || resetFor.email}
              </p>
              <div className="flex gap-3">
                <input
                  type="password"
                  inputMode="numeric"
                  autoComplete="off"
                  maxLength={4}
                  value={resetPin}
                  onChange={(e) => setResetPin(normalizePin(e.target.value))}
                  className="flex-1 p-3 bg-gray-800 border border-gray-700 rounded-xl focus:border-purple-500 focus:outline-none text-white tracking-[0.3em] text-center"
                />
                <button type="submit" className="px-4 py-2 bg-purple-600 rounded-xl hover:bg-purple-500">
                  Save
                </button>
                <button
                  type="button"
                  onClick={() => { setResetFor(null); setResetPin(''); }}
                  className="px-4 py-2 bg-gray-800 border border-gray-700 rounded-xl"
                >
                  Cancel
                </button>
              </div>
            </form>
          )}

          {loading ? (
            <p className="text-gray-400 text-sm">Loading...</p>
          ) : (
            <div className="divide-y divide-gray-800 border border-gray-800 rounded-xl overflow-hidden">
              {people.map((person) => (
                <div key={person.id} className="p-4 flex items-center justify-between gap-3 bg-gray-900">
                  <div>
                    <p className="text-white font-medium">{person.full_name || 'Unnamed'}</p>
                    <p className="text-xs text-gray-400">
                      {person.role || 'user'}
                      {Number(person.is_active) === 1 ? '' : ' · inactive'}
                      {person.id === currentUserId ? ' · you' : ''}
                    </p>
                  </div>
                  <div className="flex gap-2 text-sm">
                    <button
                      type="button"
                      onClick={() => { setResetFor(person); setResetPin(''); setError(''); }}
                      className="px-3 py-1.5 bg-gray-800 border border-gray-700 rounded-lg hover:bg-gray-700"
                    >
                      Reset PIN
                    </button>
                    {person.id !== currentUserId && (
                      Number(person.is_active) === 1 ? (
                        <button
                          type="button"
                          onClick={() => handleDeactivate(person)}
                          className="px-3 py-1.5 bg-gray-800 border border-gray-700 rounded-lg hover:bg-gray-700 text-red-300"
                        >
                          Deactivate
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => handleActivate(person)}
                          className="px-3 py-1.5 bg-gray-800 border border-gray-700 rounded-lg hover:bg-gray-700"
                        >
                          Activate
                        </button>
                      )
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default PeopleAdmin;
