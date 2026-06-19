import React, { useState, useEffect } from 'react';
import { X, Key, Save, ExternalLink } from 'lucide-react';
import { getAISettings, saveAISettings, PROVIDERS } from '../utils/ai';

const SettingsModal = ({ isOpen, onClose }) => {
    const [apiKey, setApiKey] = useState('');
    const [provider, setProvider] = useState('openrouter');
    const [model, setModel] = useState('');
    const [ollamaBaseUrl, setOllamaBaseUrl] = useState('http://localhost:11434');
    const [saved, setSaved] = useState(false);

    useEffect(() => {
        const settings = getAISettings();
        setApiKey(settings.apiKey || '');
        setProvider(settings.provider || 'openrouter');
        setOllamaBaseUrl(settings.ollamaBaseUrl || 'http://localhost:11434');

        const config = PROVIDERS.find((p) => p.id === (settings.provider || 'openrouter'));
        const defaultModel = config?.models?.[0] ?? '';
        setModel(settings.model || defaultModel);
    }, [isOpen]);

    const handleProviderChange = (newProvider) => {
        setProvider(newProvider);
        const config = PROVIDERS.find((p) => p.id === newProvider);
        setModel(config?.models?.[0] ?? '');
    };

    const handleSave = () => {
        saveAISettings({ provider, model, apiKey, ollamaBaseUrl });
        setSaved(true);
        setTimeout(() => { setSaved(false); onClose(); }, 1200);
    };

    if (!isOpen) return null;

    const providerConfig = PROVIDERS.find((p) => p.id === provider);
    const modelOptions = providerConfig?.models ?? [];

    return (
        <div className="ath-overlay" onClick={onClose}>
            <div className="ath-modal ath-modal--center" style={{ maxWidth: 460 }} onClick={e => e.stopPropagation()}>
                <div className="ath-modal-head">
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <Key size={16} style={{ color: 'var(--accent)' }} />
                        <h2 className="serif">AI Settings</h2>
                    </div>
                    <button className="ath-iconbtn" onClick={onClose} aria-label="Close"><X size={18} /></button>
                </div>

                <div className="ath-modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

                    <div>
                        <div className="label-cat" style={{ marginBottom: 8 }}>AI Provider</div>
                        <select
                            value={provider}
                            onChange={(e) => handleProviderChange(e.target.value)}
                            className="ath-input"
                        >
                            {PROVIDERS.map((p) => (
                                <option key={p.id} value={p.id}>{p.label}</option>
                            ))}
                        </select>
                    </div>

                    {provider !== 'ollama' && modelOptions.length > 0 && (
                        <div>
                            <div className="label-cat" style={{ marginBottom: 8 }}>Model</div>
                            <select
                                value={model}
                                onChange={(e) => setModel(e.target.value)}
                                className="ath-input"
                            >
                                {modelOptions.map((m) => (
                                    <option key={m} value={m}>{m}</option>
                                ))}
                            </select>
                        </div>
                    )}

                    {provider === 'ollama' && (
                        <div style={{ padding: '12px 14px', borderRadius: 'var(--r-md)', background: 'var(--accent-soft)', color: 'var(--accent-ink)', fontSize: 13, lineHeight: 1.55 }}>
                            Uses whatever model is running on your Ollama instance.
                            Run <code style={{ fontFamily: 'monospace', background: 'rgba(0,0,0,.08)', padding: '1px 5px', borderRadius: 3 }}>ollama serve model-name</code> to change it.
                        </div>
                    )}

                    {providerConfig?.requiresApiKey && (
                        <div>
                            <div className="label-cat" style={{ marginBottom: 8 }}>{providerConfig.apiKeyLabel}</div>
                            <input
                                type="password"
                                value={apiKey}
                                onChange={(e) => setApiKey(e.target.value)}
                                placeholder="Paste your API key here…"
                                className="ath-input"
                            />
                            <p style={{ marginTop: 8, fontSize: 12, color: 'var(--ink-faint)' }}>
                                {providerConfig.apiKeyHelp}{' '}
                                <a
                                    href={providerConfig.apiKeyHelpUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    style={{ color: 'var(--accent-ink)', textDecoration: 'underline', display: 'inline-flex', alignItems: 'center', gap: 3 }}
                                >
                                    {providerConfig.apiKeyHelpUrl.replace('https://', '')} <ExternalLink size={11} />
                                </a>
                            </p>
                        </div>
                    )}

                    {providerConfig?.requiresBaseUrl && (
                        <div>
                            <div className="label-cat" style={{ marginBottom: 8 }}>Ollama Base URL</div>
                            <input
                                type="text"
                                value={ollamaBaseUrl}
                                onChange={(e) => setOllamaBaseUrl(e.target.value)}
                                placeholder="http://localhost:11434"
                                className="ath-input"
                            />
                        </div>
                    )}

                    <button
                        onClick={handleSave}
                        className="ath-btn ath-btn--primary ath-btn--md"
                        style={{ width: '100%', justifyContent: 'center', ...(saved ? { background: 'var(--success, #2f9e44)' } : {}) }}
                    >
                        {saved ? '✓ Saved!' : <><Save size={16} /><span>Save Settings</span></>}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default SettingsModal;
