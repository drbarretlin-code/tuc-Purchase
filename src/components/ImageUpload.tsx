import React from 'react';
import { X, Type, ImagePlus } from 'lucide-react';
import { t } from '../lib/i18n';
import type { Language } from '../lib/i18n';
import type { SpecImage } from '../types/form';

interface Props {
  images: SpecImage[];
  onChange: (images: SpecImage[]) => void;
  language: Language;
}

const ImageUpload: React.FC<Props> = ({ images, onChange, language }) => {
  const handleUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (images.length + files.length > 6) {
      alert(t('maxImages', language));
      return;
    }

    files.forEach(file => {
      const reader = new FileReader();
      reader.onload = (event) => {
        const newImage: SpecImage = {
          id: Math.random().toString(36).substr(2, 9),
          url: event.target?.result as string,
          caption: ''
        };
        onChange([...images, newImage]);
      };
      reader.readAsDataURL(file);
    });
  };

  const removeImage = (id: string) => {
    onChange(images.filter(img => img.id !== id));
  };

  const updateCaption = (id: string, caption: string) => {
    onChange(images.map(img => img.id === id ? { ...img, caption } : img));
  };

  return (
    <div className="image-upload-section">
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '1rem' }}>
        {images.map((img) => (
          <div key={img.id} className="glass-panel" style={{ padding: '0.5rem', position: 'relative' }}>
            <img 
              src={img.url} 
              alt="upload" 
              style={{ width: '100%', height: '120px', objectFit: 'cover', borderRadius: '4px' }} 
            />
            <button 
              onClick={() => removeImage(img.id)}
              style={{ position: 'absolute', top: '5px', right: '5px', padding: '2px', background: 'rgba(0,0,0,0.5)', border: 'none', borderRadius: '50%', color: 'white', cursor: 'pointer' }}
            >
              <X size={14} />
            </button>
            <div style={{ marginTop: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Type size={14} color="#9CA3AF" />
              <input 
                type="text" 
                value={img.caption}
                onChange={(e) => updateCaption(img.id, e.target.value)}
                placeholder={t('captionPlaceholder', language)}
                style={{ fontSize: '0.75rem', padding: '4px' }}
              />
            </div>
          </div>
        ))}
        
        {images.length < 6 && (
          <label style={{ 
            height: '180px', 
            border: '2px dashed var(--border-color)', 
            borderRadius: '8px', 
            display: 'flex', 
            flexDirection: 'column', 
            alignItems: 'center', 
            justifyContent: 'center',
            cursor: 'pointer',
            gap: '0.5rem',
            color: 'var(--text-secondary)'
          }}>
            <ImagePlus size={32} />
            <span style={{ fontSize: '0.875rem' }}>{t('clickToUpload', language)} ({images.length}/6)</span>
            <input type="file" multiple accept="image/*" style={{ display: 'none' }} onChange={handleUpload} />
          </label>
        )}
      </div>
    </div>
  );
};

export default ImageUpload;
