import { OTPInput, SlotProps } from 'input-otp';
import { cn } from '@/lib/utils';

export type OTPInputWrapperType = {
  onChange: (value: string) => void;
};

export default function OTPInputWrapper({ ...props }: OTPInputWrapperType) {
  return (
    <OTPInput
      autoFocus
      maxLength={6}
      containerClassName="w-full"
      onChange={(value) => props.onChange(value)}
      render={({ slots }) => (
        <div className="flex justify-center items-center gap-2">
          {slots.slice(0, 3).map((s, idx) => (
            <Slot key={idx} {...s} />
          ))}
          <div className="text-muted-foreground">-</div>
          {slots.slice(3).map((s, idx) => (
            <Slot key={idx + 3} {...s} />
          ))}
        </div>
      )}
    />
  );
}

const Slot = (props: SlotProps) => {
  return (
    <div
      className={cn(
        'flex h-12 w-12 items-center justify-center rounded-md border text-lg font-medium',
        props.isActive
          ? 'border-primary ring-1 ring-primary'
          : 'border-input',
        props.char && 'bg-muted'
      )}
    >
      {props.char !== null && <div>{props.char}</div>}
    </div>
  );
};
