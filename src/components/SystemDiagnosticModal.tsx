import React from 'react';
import { X, Activity, Server, Database, AlertTriangle, CheckCircle, RefreshCcw, Repeat } from 'lucide-react';
import { t } from '../lib/i18n';

interface SystemDiagnosticProps {
  isOpen: boolean;
  onClose: () => void;
  data: any;
  onRefresh: () => void;
  onFix: () => void;
  isRefreshing: boolean;
  isFixing: boolean;
}

const SystemDiagnosticModal: React.FC<SystemDiagnosticProps> = ({ 
  isOpen, onClose, data, onRefresh, onFix, isRefreshing, isFixing 
}) => {
  if (!isOpen || !data) return null;

  return (
    <div className="modal-overlay" style={{ zIndex: 3500 }}>
      <div className="glass-panel modal-content" style={{ padding: '2rem', maxWidth: '600px', width: '95%', maxHeight: '85vh', overflowY: 'auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <Activity size={24} color="var(--tuc-red)" />
            <h2 style={{ margin: 0, fontSize: '1.25rem', color: 'white' }}>{t('diagTitle', data.language || 'zh-TW')}</h2>
          </div>
          <button onClick={onClose} className="icon-btn">
            <X size={24} />
          </button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {/* 1. 環境狀態 */}
          <section>
            <h3 style={{ fontSize: '0.9rem', color: '#888', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Server size={16} /> {t('diagEnvCheck', data.language || 'zh-TW')}
            </h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
              {Object.entries(data.environment || {}).map(([key, val]: [string, any]) => (
                <div key={key} style={{ display: 'flex', justifyContent: 'space-between', background: 'rgba(255,255,255,0.03)', padding: '8px 12px', borderRadius: '6px', fontSize: '0.75rem' }}>
                  <span style={{ color: '#aaa' }}>{key.replace('_CONFIGURED', '')}</span>
                  <span style={{ color: val ? '#10B981' : '#EF4444' }}>{val ? 'OK' : 'MISSING'}</span>
                </div>
              ))}
            </div>
          </section>

          {/* 2. 佇列摘要 */}
          <section>
            <h3 style={{ fontSize: '0.9rem', color: '#888', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Database size={16} /> {t('diagQueueStatus', data.language || 'zh-TW')}
            </h3>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              <div style={{ flex: 1, minWidth: '100px', background: 'rgba(16,185,129,0.1)', padding: '12px', borderRadius: '8px', textAlign: 'center' }}>
                <div style={{ fontSize: '1.25rem', fontWeight: 'bold', color: '#10B981' }}>{data.queue_summary.completed}</div>
                <div style={{ fontSize: '0.65rem', color: '#10B981', marginTop: '4px' }}>{t('queueParsed', data.language || 'zh-TW')}</div>
              </div>
              <div style={{ flex: 1, minWidth: '100px', background: 'rgba(96,165,250,0.1)', padding: '12px', borderRadius: '8px', textAlign: 'center' }}>
                <div style={{ fontSize: '1.25rem', fontWeight: 'bold', color: '#60A5FA' }}>{data.queue_summary.processing}</div>
                <div style={{ fontSize: '0.65rem', color: '#60A5FA', marginTop: '4px' }}>{t('queueProcessing', data.language || 'zh-TW')}</div>
              </div>
              <div style={{ flex: 1, minWidth: '100px', background: 'rgba(245,158,11,0.1)', padding: '12px', borderRadius: '8px', textAlign: 'center' }}>
                <div style={{ fontSize: '1.25rem', fontWeight: 'bold', color: '#F59E0B' }}>{data.queue_summary.pending}</div>
                <div style={{ fontSize: '0.65rem', color: '#F59E0B', marginTop: '4px' }}>{t('queuePending', data.language || 'zh-TW')}</div>
              </div>
              <div style={{ flex: 1, minWidth: '100px', background: 'rgba(239,68,68,0.1)', padding: '12px', borderRadius: '8px', textAlign: 'center' }}>
                <div style={{ fontSize: '1.25rem', fontWeight: 'bold', color: '#EF4444' }}>{data.queue_summary.failed}</div>
                <div style={{ fontSize: '0.65rem', color: '#EF4444', marginTop: '4px' }}>{t('queueFailed', data.language || 'zh-TW')}</div>
              </div>
            </div>
          </section>

          {/* 3. 死鎖偵測 */}
          <section>
            <h3 style={{ fontSize: '0.9rem', color: '#888', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <AlertTriangle size={16} /> {t('diagDeadlockDetect', data.language || 'zh-TW')}
            </h3>
            {data.potential_deadlocks.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {data.potential_deadlocks.map((f: any, i: number) => (
                  <div key={i} style={{ padding: '10px', background: 'rgba(239,68,68,0.05)', borderRadius: '8px', border: '1px solid rgba(239,68,68,0.1)', fontSize: '0.8rem' }}>
                    <div style={{ color: '#EF4444', fontWeight: 'bold' }}>{f.name}</div>
                    <div style={{ color: '#888', marginTop: '4px' }}>
                      {t('diagStatus', data.language || 'zh-TW')} {f.status} | {t('diagStalled', data.language || 'zh-TW')} {f.age_minutes} {t('diagMinutes', data.language || 'zh-TW')}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ padding: '1rem', textAlign: 'center', background: 'rgba(16,185,129,0.05)', borderRadius: '8px', color: '#10B981', fontSize: '0.8rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                <CheckCircle size={16} /> {t('diagNoDeadlock', data.language || 'zh-TW')}
              </div>
            )}
          </section>

          {/* 4. 專家建議 */}
          <section style={{ padding: '1rem', background: 'var(--bg-secondary)', borderRadius: '8px', borderLeft: '4px solid var(--tuc-red)' }}>
            <h4 style={{ margin: '0 0 0.5rem', fontSize: '0.85rem', color: 'white' }}>{t('diagAnalysis', data.language || 'zh-TW')}</h4>
            <p style={{ margin: 0, fontSize: '0.8rem', color: '#bbb', lineHeight: 1.6 }}>{data.recommendation}</p>
          </section>

          <div style={{ marginTop: '1rem', display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {data.potential_deadlocks.length > 0 && (
              <button 
                onClick={onFix} 
                className="primary-button" 
                disabled={isFixing}
                style={{ width: '100%', justifyContent: 'center', background: 'var(--tuc-red)', border: 'none' }}
              >
                {isFixing ? <RefreshCcw size={18} className="spin" /> : <Repeat size={18} />}
                {t('diagFix', data.language || 'zh-TW')}
              </button>
            )}
            
            <div style={{ display: 'flex', gap: '12px' }}>
              <button onClick={onRefresh} className="ghost-button" disabled={isRefreshing} style={{ flex: 1, gap: '8px', justifyContent: 'center' }}>
                <RefreshCcw size={16} className={isRefreshing ? 'spin' : ''} /> {t('retryTranslation', data.language || 'zh-TW')}
              </button>
              <button onClick={onClose} className="ghost-button" style={{ flex: 1, justifyContent: 'center' }}>
                {t('close', data.language || 'zh-TW')}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SystemDiagnosticModal;
