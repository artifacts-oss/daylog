import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import PasswordInput from '@/components/PasswordInput';
import { cn } from '@/lib/utils';

type FormFieldProps = {
  label: string;
  name: string;
  type?: string;
  placeholder?: string;
  defaultValue?: string;
  errors?: string | string[];
  required?: boolean;
  autoComplete?: string;
  className?: string;
};

/**
 * Renders a labeled input and any supplied errors, with a visibility toggle for
 * password fields. Uses name as the input ID; className styles the input.
 */
export default function FormField({
  label,
  name,
  type = 'text',
  placeholder,
  defaultValue,
  errors,
  required = false,
  autoComplete = 'off',
  className = '',
}: FormFieldProps) {
  const inputProps = {
    defaultValue,
    className: cn(
      errors && 'border-destructive focus-visible:ring-destructive',
      className,
    ),
    placeholder,
    required,
    autoComplete,
  };

  return (
    <div className="space-y-2 relative pb-5">
      <Label htmlFor={name}>
        {label}
        {required && <span className="text-destructive ml-1">*</span>}
      </Label>
      {type === 'password' ? (
        <PasswordInput id={name} name={name} {...inputProps} />
      ) : (
        <Input id={name} name={name} type={type} {...inputProps} />
      )}
      {errors && (
        <p
          className="text-[12px] text-destructive relative bottom-0 left-0"
          role="alert"
        >
          {Array.isArray(errors)
            ? errors.map((error, i) => <span key={i}>{error}</span>)
            : errors}
        </p>
      )}
    </div>
  );
}
