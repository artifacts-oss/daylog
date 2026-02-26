import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
  return (
    <div className="space-y-2 relative pb-5">
      <Label htmlFor={name}>
        {label}
        {required && <span className="text-destructive ml-1">*</span>}
      </Label>
      <Input
        id={name}
        name={name}
        type={type}
        defaultValue={defaultValue}
        className={cn(
          errors && 'border-destructive focus-visible:ring-destructive',
          className,
        )}
        placeholder={placeholder}
        required={required}
        autoComplete={autoComplete}
      />
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
