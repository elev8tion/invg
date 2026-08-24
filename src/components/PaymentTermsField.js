import React, { useEffect, useRef, useState } from 'react';

/**
 * Payment terms picker: presets plus a custom "Net N days" entry.
 *
 * Used in two places with different needs:
 *   - BusinessModal sets the business-wide default (no `defaultTerms` passed).
 *   - The invoice form sets terms for one invoice, and passes the business
 *     default so the field can show whether this invoice follows it or
 *     overrides it.
 */

export const PAYMENT_TERM_PRESETS = ['Due on Receipt', 'Net 15', 'Net 30', 'Net 45', 'Net 60'];
export const CUSTOM_TERMS = '__custom__';

/** Pull the day count out of a "Net 45" style value. */
export const daysFromTerms = (terms) => {
  const match = /^Net\s+(\d+)$/i.exec(String(terms || '').trim());
  return match ? match[1] : '';
};

/** Build the option list, folding in a business default that isn't a preset. */
export const termsOptions = (defaultTerms) => {
  const options = [...PAYMENT_TERM_PRESETS];
  if (defaultTerms && !options.includes(defaultTerms)) options.unshift(defaultTerms);
  return options;
};

/** A value is "custom" when it is set but not one of the offered options. */
export const isCustomValue = (value, defaultTerms) =>
  Boolean(value) && !termsOptions(defaultTerms).includes(value);

export const validateTerms = (value, isCustom) => {
  if (!isCustom) return '';
  const days = Number(daysFromTerms(value));
  if (!days || !Number.isInteger(days) || days < 1 || days > 365) {
    return 'Enter a whole number of days between 1 and 365';
  }
  return '';
};

const PaymentTermsField = ({
  value,
  onChange,
  defaultTerms = '',
  error = '',
  label = 'Payment Terms',
  selectClassName = '',
  compact = false,
}) => {
  const options = termsOptions(defaultTerms);

  const [isCustom, setIsCustom] = useState(() => isCustomValue(value, defaultTerms));
  const [days, setDays] = useState(() => daysFromTerms(value));

  // Values this component emitted itself. Without this, choosing "Custom" and
  // landing on a value that happens to match a preset (e.g. seeding 75 from
  // "Net 75") would make the sync effect below flip straight back out of
  // custom mode, and the picker would appear to ignore the click.
  const selfEmitted = useRef(null);

  // Re-sync only when the value changes from OUTSIDE -- a business loading, a
  // different invoice being edited -- never in response to our own onChange.
  useEffect(() => {
    if (value === selfEmitted.current) return;
    const custom = isCustomValue(value, defaultTerms);
    setIsCustom(custom);
    if (custom) setDays(daysFromTerms(value));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, defaultTerms]);

  const emit = (next) => {
    selfEmitted.current = next;
    onChange(next);
  };

  const handleSelect = (e) => {
    const next = e.target.value;
    if (next === CUSTOM_TERMS) {
      setIsCustom(true);
      const seeded = days || daysFromTerms(value);
      setDays(seeded);
      emit(seeded ? `Net ${seeded}` : '');
      return;
    }
    setIsCustom(false);
    emit(next);
  };

  const handleDays = (e) => {
    const next = e.target.value;
    setDays(next);
    emit(next ? `Net ${next}` : '');
  };

  const followsDefault = Boolean(defaultTerms) && value === defaultTerms;
  const overridesDefault = Boolean(defaultTerms) && Boolean(value) && value !== defaultTerms;

  return (
    <div>
      {label && <label className="block text-sm text-gray-400 mb-2">{label}</label>}

      <select
        value={isCustom ? CUSTOM_TERMS : value || ''}
        onChange={handleSelect}
        aria-label={label}
        className={
          selectClassName ||
          'w-full p-3 bg-gray-800 border border-gray-700 rounded-xl focus:border-purple-500 focus:outline-none text-white'
        }
      >
        {options.map((term) => (
          <option key={term} value={term}>
            {term === defaultTerms ? `${term} (business default)` : term}
          </option>
        ))}
        <option value={CUSTOM_TERMS}>Custom...</option>
      </select>

      {isCustom && (
        <div className={compact ? 'mt-2' : 'mt-2'}>
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-400">Net</span>
            <input
              type="number"
              value={days}
              onChange={handleDays}
              autoFocus
              min="1"
              max="365"
              step="1"
              placeholder="90"
              aria-label={`${label} in days`}
              className={`w-24 p-2 bg-gray-800 border rounded-xl focus:outline-none text-white ${
                error ? 'border-red-500 focus:border-red-500' : 'border-gray-700 focus:border-purple-500'
              }`}
            />
            <span className="text-sm text-gray-400">days</span>
          </div>
          {error ? (
            <p className="text-red-400 text-xs mt-1">{error}</p>
          ) : (
            <p className="text-gray-500 text-xs mt-1">
              Saved as &quot;{days ? `Net ${days}` : 'Net ...'}&quot;
            </p>
          )}
        </div>
      )}

      {!isCustom && followsDefault && (
        <p className="text-gray-500 text-xs mt-1">Using the business default.</p>
      )}
      {overridesDefault && !error && (
        <p className="text-amber-400/80 text-xs mt-1">
          Overrides the business default ({defaultTerms}).
        </p>
      )}
    </div>
  );
};

export default PaymentTermsField;
