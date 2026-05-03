'use client';

import { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';

interface LogFilterMultiSelectProps {
  name: string;
  options: string[];
  selectedValues: string[];
  placeholder: string;
}

/**
 * Выпадающий multi-select для GET-фильтров журнала.
 * Выбранные значения передаются формой через скрытые inputs.
 */
export const LogFilterMultiSelect = ({
  name,
  options,
  selectedValues,
  placeholder
}: LogFilterMultiSelectProps) => {
  const [values, setValues] = useState(selectedValues);
  const label = values.length > 0 ? values.join(', ') : placeholder;

  /**
   * Переключает значение фильтра.
   * @param value - Значение option.
   * @param checked - Следующее состояние checkbox.
   */
  const toggleValue = (value: string, checked: boolean) => {
    setValues(currentValues => {
      if (checked) {
        return currentValues.includes(value) ? currentValues : [...currentValues, value];
      }

      return currentValues.filter(currentValue => currentValue !== value);
    });
  };

  return (
    <div>
      {values.map(value => (
        <input key={value} type="hidden" name={name} value={value} />
      ))}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            type="button"
            variant="outline"
            className="h-9 w-full justify-between overflow-hidden px-3 font-normal"
          >
            <span className="truncate">{label}</span>
            <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-60" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-56">
          {options.map(option => (
            <DropdownMenuCheckboxItem
              key={option}
              checked={values.includes(option)}
              onCheckedChange={checked => toggleValue(option, Boolean(checked))}
              onSelect={event => event.preventDefault()}
            >
              {option}
            </DropdownMenuCheckboxItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
};
