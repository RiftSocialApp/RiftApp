import { useDeveloperStore } from '../../stores/developerStore';

export default function AppVerificationPage() {
  const { currentApp } = useDeveloperStore();

  const checks = [
    { label: 'Terms of Service URL provided', met: !!currentApp?.terms_of_service_url },
    { label: 'Privacy Policy URL provided', met: !!currentApp?.privacy_policy_url },
    { label: 'Application has a description', met: !!(currentApp?.description && currentApp.description.length > 10) },
    { label: 'Application has an icon', met: !!currentApp?.icon },
    { label: 'Bot is in fewer than 76 hubs', met: true },
  ];

  const allMet = checks.every(c => c.met);

  return (
    <div className="max-w-3xl mx-auto px-6 py-8">
      <h2 className="text-xl font-semibold text-white mb-6">App Verification</h2>

      <div className="bg-[#12122a] border border-white/5 rounded-lg p-6 mb-6">
        <h3 className="text-sm font-semibold text-white mb-1">Verification Status</h3>
        <p className="text-sm text-gray-400 mb-4">
          Verified apps can be added to more than 100 hubs and gain access to additional features.
        </p>
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-yellow-600/10 text-yellow-400 text-sm">
          <span className="w-2 h-2 rounded-full bg-yellow-400" />
          Not Verified
        </div>
      </div>

      <div className="space-y-3 mb-6">
        <h3 className="text-sm font-semibold text-white">Requirements</h3>
        {checks.map((check, i) => (
          <div key={i} className="flex items-center gap-3">
            <div className={`w-5 h-5 rounded flex items-center justify-center text-xs ${check.met ? 'bg-green-600/20 text-green-400' : 'bg-red-600/20 text-red-400'}`}>
              {check.met ? '✓' : '✗'}
            </div>
            <span className={`text-sm ${check.met ? 'text-gray-300' : 'text-gray-500'}`}>{check.label}</span>
          </div>
        ))}
      </div>

      <button
        disabled={!allMet}
        className="px-6 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded text-sm font-medium transition-colors"
      >
        Submit for Verification
      </button>
    </div>
  );
}
