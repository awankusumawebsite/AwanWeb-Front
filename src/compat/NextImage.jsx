import React from 'react';

function resolveSource(source) {
  if (typeof source === 'string') return source;
  if (source && typeof source === 'object' && typeof source.src === 'string') return source.src;
  return '';
}

export default function NextImage({
  src,
  alt,
  fill = false,
  priority = false,
  fetchPriority,
  loading,
  width,
  height,
  sizes,
  quality: _quality,
  style,
  ...props
}) {
  const fillStyle = fill
    ? {
        position: 'absolute',
        inset: 0,
        width: '100%',
        height: '100%',
      }
    : {};

  return (
    <img
      {...props}
      src={resolveSource(src)}
      alt={alt ?? ''}
      width={fill ? undefined : width}
      height={fill ? undefined : height}
      sizes={sizes}
      loading={priority ? 'eager' : (loading ?? 'lazy')}
      fetchPriority={fetchPriority ?? (priority ? 'high' : undefined)}
      decoding="async"
      style={{ ...fillStyle, ...style }}
    />
  );
}
