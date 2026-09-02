import { type ReactNode } from 'react';
import { Plus } from 'lucide-react';

type PageHeadingProps = {
  eyebrow: string;
  title: string;
  description: string;
  action?: () => void;
  actionLabel?: string;
  secondaryAction?: () => void;
  secondaryActionLabel?: string;
  secondaryActionDisabled?: boolean;
};

export function PageHeading({ eyebrow, title, description, action, actionLabel, secondaryAction, secondaryActionLabel, secondaryActionDisabled }: PageHeadingProps) {
  return (
    <div className="page-heading">
      <div>
        <div className="eyebrow">{eyebrow}</div>
        <h1>{title}</h1>
        <p>{description}</p>
      </div>
      <div className="page-heading-actions">
        {secondaryAction && secondaryActionLabel && (
          <button className="danger-button" onClick={secondaryAction} disabled={secondaryActionDisabled}>
            {secondaryActionLabel}
          </button>
        )}
        {action && actionLabel && (
          <button className="primary-button" onClick={action}>
            <Plus size={17} /> {actionLabel}
          </button>
        )}
      </div>
    </div>
  );
}

export function Badge({ label, tone }: { label: string; tone: string }) {
  return <span className={`badge ${tone}`}>{label}</span>;
}

export function EmptyState({ text }: { text: string }) {
  return <div className="empty-state">{text}</div>;
}

type FormFieldProps = {
  label: string;
  name: string;
  type?: string;
  placeholder?: string;
  required?: boolean;
  defaultValue?: string;
  children?: ReactNode;
};

export function FormField({ label, name, type = 'text', placeholder, required = true, defaultValue, children }: FormFieldProps) {
  return (
    <label className="form-field">
      <span>{label}</span>
      {children ?? (
        <input name={name} type={type} placeholder={placeholder} required={required} defaultValue={defaultValue} />
      )}
    </label>
  );
}

export function FormActions({ onCancel, label }: { onCancel: () => void; label: string }) {
  return (
    <div className="form-actions">
      <button type="button" className="secondary-button" onClick={onCancel}>Cancelar</button>
      <button type="submit" className="primary-button">{label}</button>
    </div>
  );
}
