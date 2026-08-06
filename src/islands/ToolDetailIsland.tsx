import { useEffect, useState } from 'react';
import type { Locale } from '../config/site';
import { fetchRuntimeTool, runtimeToolSlug, safeToolUrl } from '../lib/runtime-tools';
import type { CmsTool } from '../lib/tools';

interface Props {
  backendOrigin: string;
  locale: Locale;
}

export default function ToolDetailIsland({ backendOrigin, locale }: Props) {
  const [tool, setTool] = useState<CmsTool | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    const slug = runtimeToolSlug(window.location);
    if (!slug) {
      setNotFound(true);
      setLoading(false);
      return undefined;
    }

    const controller = new AbortController();
    fetchRuntimeTool({ origin: backendOrigin, slug, signal: controller.signal })
      .then((runtimeTool) => {
        setTool(runtimeTool);
        setNotFound(false);
        document.title = `${runtimeTool.name} | Awan Kusuma Utilities`;

        const description = document.querySelector<HTMLMetaElement>('meta[name="description"]');
        if (description && runtimeTool.description) description.content = runtimeTool.description;

        const canonical = document.querySelector<HTMLLinkElement>('link[rel="canonical"]');
        if (canonical) canonical.href = `${window.location.origin}${window.location.pathname}`;
      })
      .catch((fetchError: unknown) => {
        if ((fetchError as Error)?.name !== 'AbortError') setNotFound(true);
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });

    return () => controller.abort();
  }, [backendOrigin]);

  if (loading) {
    return (
      <div className="flex min-h-[520px] items-center justify-center rounded-3xl border border-black/5 bg-white">
        <p className="font-medium text-black/45">Memuat tool terbaru...</p>
      </div>
    );
  }

  if (notFound || !tool) {
    const toolsHref = locale === 'id' ? '/tools' : `/${locale}/tools`;

    return (
      <div className="flex min-h-[520px] items-center justify-center rounded-3xl border border-black/5 bg-white px-8 text-center">
        <div>
          <p className="text-xl font-bold text-big-stone">Tool tidak ditemukan atau belum aktif.</p>
          <a href={toolsHref} className="mt-4 inline-block text-sm font-bold text-elm hover:underline">Kembali ke daftar tools</a>
        </div>
      </div>
    );
  }

  const externalUrl = tool.type === 'url' ? safeToolUrl(tool.url) : null;

  return (
    <div>
      <div className="mb-10">
        <p className="mb-4 text-xs font-extrabold uppercase tracking-[0.2em] text-elm">Utility suite</p>
        <h1 className="text-3xl font-black tracking-tight text-big-stone md:text-5xl">{tool.name}</h1>
        {tool.description && <p className="mt-4 max-w-2xl text-sm font-medium text-black/60 md:text-base">{tool.description}</p>}
      </div>

      <div className="overflow-hidden rounded-3xl border border-black/5 bg-white shadow-[0_20px_60px_-15px_rgba(0,0,0,0.1)] md:rounded-[40px]">
        {tool.type === 'html' && tool.html_content ? (
          <iframe
            srcDoc={tool.html_content}
            sandbox="allow-scripts allow-downloads"
            referrerPolicy="no-referrer"
            title={tool.name}
            className="h-[700px] w-full border-0 bg-white lg:h-[800px]"
          />
        ) : tool.type === 'url' && externalUrl ? (
          <iframe
            src={externalUrl}
            sandbox="allow-scripts allow-same-origin allow-forms allow-downloads"
            referrerPolicy="no-referrer"
            title={tool.name}
            className="h-[700px] w-full border-0 bg-white lg:h-[800px]"
          />
        ) : (
          <div className="flex min-h-80 items-center justify-center p-10 text-center">
            <div>
              <p className="font-semibold text-big-stone">Tool ini belum dapat dijalankan pada Astro.</p>
              <p className="mt-2 text-sm text-black/45">
                Pastikan konten HTML tersedia, URL menggunakan HTTPS, atau gunakan tipe tool yang didukung.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
