import { useState } from 'react';
import AddDocumentButton from './AddDoc';
import ProviderDocuments from './ProviderDocuments';

type Tab = 'create' | 'documents';

function Provider() {
  const [activeTab, setActiveTab] = useState<Tab>('documents');

  return (
    <div className="max-w-4xl mx-auto px-4 py-6">
      {/* Tab navigation */}
      <div className="flex border-b border-slate-200 dark:border-slate-800 mb-6 justify-center gap-2">
        <button
          type="button"
          onClick={() => setActiveTab('documents')}
          className={`px-6 py-2.5 text-sm font-semibold border-b-2 transition-colors cursor-pointer ${
            activeTab === 'documents'
              ? 'border-indigo-600 text-indigo-700 dark:border-indigo-400 dark:text-indigo-400'
              : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300 dark:text-slate-400 dark:hover:text-slate-200 dark:hover:border-slate-700'
          }`}
        >
          My Evidence Records & Upload
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('create')}
          className={`px-6 py-2.5 text-sm font-semibold border-b-2 transition-colors cursor-pointer ${
            activeTab === 'create'
              ? 'border-indigo-600 text-indigo-700 dark:border-indigo-400 dark:text-indigo-400'
              : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300 dark:text-slate-400 dark:hover:text-slate-200 dark:hover:border-slate-700'
          }`}
        >
          + Create New Container
        </button>
      </div>

      {activeTab === 'create' && <AddDocumentButton onCreated={() => setActiveTab('documents')} />}
      {activeTab === 'documents' && <ProviderDocuments />}
    </div>
  );
}

export default Provider;
