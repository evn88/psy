import * as React from 'react';
import { Badge } from '@/components/ui/badge';
import { X } from 'lucide-react';

interface UserOption {
  id: string;
  name: string | null;
  email: string | null;
}

interface MultiEmailSelectProps {
  options: UserOption[];
  value: string[];
  onChange: (value: string[]) => void;
  placeholder?: string;
  disabled?: boolean;
}

export function MultiEmailSelect({
  options,
  value,
  onChange,
  placeholder = 'Введите email или выберите из списка...',
  disabled = false
}: MultiEmailSelectProps) {
  const [inputValue, setInputValue] = React.useState('');
  const [isFocused, setIsFocused] = React.useState(false);

  const containerRef = React.useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsFocused(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleUnselect = (emailToRemove: string) => {
    onChange(value.filter(email => email !== emailToRemove));
  };

  const handleSelect = (emailToAdd: string) => {
    if (!value.includes(emailToAdd)) {
      onChange([...value, emailToAdd]);
    }
    setInputValue('');
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      const newEmail = inputValue.trim();
      // Basic email validation before adding arbitrary text
      if (newEmail && /^\S+@\S+\.\S+$/.test(newEmail)) {
        if (!value.includes(newEmail)) {
          onChange([...value, newEmail]);
        }
        setInputValue('');
      }
    } else if (e.key === 'Backspace' && inputValue === '' && value.length > 0) {
      onChange(value.slice(0, -1));
    }
  };

  // Filter options based on input value
  const filteredOptions = options.filter(opt => {
    const searchPart = inputValue.toLowerCase();
    const searchString = `${opt.name || ''} ${opt.email || ''}`.toLowerCase();
    return searchString.includes(searchPart) && opt.email && !value.includes(opt.email);
  });

  return (
    <div ref={containerRef} className="relative w-full">
      <div
        className={`flex flex-wrap items-center gap-2 rounded-md border border-input bg-transparent px-3 py-2 text-sm ring-offset-background focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2 ${
          disabled ? 'cursor-not-allowed opacity-50' : ''
        }`}
        onClick={() => setIsFocused(true)}
      >
        {value.map(email => {
          const matchedUser = options.find(o => o.email === email);
          return (
            <Badge key={email} variant="secondary" className="flex items-center gap-1 font-normal">
              {matchedUser && matchedUser.name ? matchedUser.name : email}
              {!disabled && (
                <button
                  type="button"
                  className="rounded-full outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 ring-offset-background"
                  onKeyDown={e => {
                    if (e.key === 'Enter') handleUnselect(email);
                  }}
                  onMouseDown={e => {
                    e.preventDefault();
                    e.stopPropagation();
                  }}
                  onClick={e => {
                    e.preventDefault();
                    e.stopPropagation();
                    handleUnselect(email);
                  }}
                >
                  <X className="h-3 w-3 text-muted-foreground hover:text-foreground" />
                </button>
              )}
            </Badge>
          );
        })}
        <input
          type="text"
          value={inputValue}
          onChange={e => setInputValue(e.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={() => setIsFocused(true)}
          placeholder={value.length === 0 ? placeholder : ''}
          disabled={disabled}
          autoComplete="new-password"
          autoCorrect="off"
          autoCapitalize="none"
          spellCheck="false"
          data-1p-ignore="true"
          className="flex-1 bg-transparent outline-none placeholder:text-muted-foreground min-w-[120px]"
        />
      </div>

      {isFocused && !disabled && (
        <div className="absolute top-full z-10 mt-2 w-full rounded-md border bg-popover text-popover-foreground shadow-md outline-none animate-in fade-in-0 zoom-in-95 max-h-[300px] overflow-auto">
          {inputValue && /^\S+@\S+\.\S+$/.test(inputValue) && !value.includes(inputValue) && (
            <div
              className="relative flex cursor-pointer select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none hover:bg-accent hover:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50"
              onMouseDown={e => {
                e.preventDefault();
                handleSelect(inputValue);
              }}
            >
              Добавить &quot;{inputValue}&quot;
            </div>
          )}
          {filteredOptions.length === 0 && (!inputValue || !/^\S+@\S+\.\S+$/.test(inputValue)) && (
            <div className="py-6 text-center text-sm text-muted-foreground">
              Нет подходящих профилей
            </div>
          )}
          {filteredOptions.map(opt => (
            <div
              key={opt.id}
              className="relative flex cursor-pointer select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none hover:bg-accent hover:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50"
              onMouseDown={e => {
                e.preventDefault();
                if (opt.email) handleSelect(opt.email);
              }}
            >
              <div className="flex flex-col">
                <span className="font-medium">{opt.name || 'Без имени'}</span>
                <span className="text-xs text-muted-foreground">{opt.email}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
