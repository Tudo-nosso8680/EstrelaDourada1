import { type ReactNode } from 'react';
import { X } from 'lucide-react';

type ModalProps = {
  title: string;
  subtitle?: string;
  onClose: () => void;
  children: ReactNode;
  size?: 'sm' | 'md' | 'lg';
};

export function Modal({ title, subtitle, onClose, children, size = 'md' }: ModalProps) {
  return (
    <div className="modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <div className={`modal modal-${size}`}>
        <div className="modal-header">
          <div>
            <h2>{title}</h2>
            {subtitle && <p>{subtitle}</p>}
          </div>
          <button className="icon-button" onClick={onClose} aria-label="Fechar"><X size={19} /></button>
        </div>
        {children}
      </div>
    </div>
  );
}
