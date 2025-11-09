
import React from 'react';

interface OutputItem {
    id: string | number;
    type: 'info' | 'success' | 'warning' | 'error';
    message: string;
}

interface OutputPanelProps {
  title: string;
  items: OutputItem[];
}

const itemColorClasses = {
    info: 'text-gray-700',
    success: 'text-green-700',
    warning: 'text-yellow-700',
    error: 'text-red-700',
};

export const OutputPanel: React.FC<OutputPanelProps> = ({ title, items }) => {
    const panelRef = React.useRef<HTMLDivElement>(null);

    React.useEffect(() => {
        if(panelRef.current) {
            panelRef.current.scrollTop = panelRef.current.scrollHeight;
        }
    }, [items]);

  return (
    <div className="bg-white p-4 rounded-xl shadow-md flex flex-col h-64">
      <h3 className="text-lg font-bold text-gray-800 mb-2 flex-shrink-0">{title}</h3>
      <div ref={panelRef} className="flex-grow overflow-y-auto bg-gray-50 rounded-md p-2 font-mono text-xs space-y-1">
        {items.length > 0 ? items.map(item => (
          <p key={item.id} className={`${itemColorClasses[item.type]}`}>
            {item.message}
          </p>
        )) : <p className="text-gray-400">No items to display.</p>}
      </div>
    </div>
  );
};
