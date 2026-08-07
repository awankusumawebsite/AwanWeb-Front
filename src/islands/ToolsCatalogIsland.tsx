import { useEffect, useState } from 'react';
import type { Locale } from '../config/site';
import { fetchRuntimeTools } from '../lib/runtime-tools';
import type { CmsTool } from '../lib/tools';
import { getToolIcon } from '../lib/tool-icons';

interface Props {
  backendOrigin: string;
  initialTools: CmsTool[];
  locale: Locale;
}

function toolHref(slug: string, locale: Locale): string {
  const prefix = locale === 'id' ? '' : `/${locale}`;
  return `${prefix}/tools/${encodeURIComponent(slug)}`;
}

export default function ToolsCatalogIsland({ backendOrigin, initialTools, locale }: Props) {
  const [tools, setTools] = useState(initialTools);
  const [loading, setLoading] = useState(initialTools.length === 0);
  const [error, setError] = useState(false);

  useEffect(() => {
    const controller = new AbortController();

    fetchRuntimeTools({ origin: backendOrigin, signal: controller.signal })
      .then((runtimeTools) => {
        setTools(runtimeTools);
        setError(false);
      })
      .catch((fetchError: unknown) => {
        if ((fetchError as Error)?.name !== 'AbortError') setError(true);
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });

    return () => controller.abort();
  }, [backendOrigin]);

  if (loading) {
    return (
      <div className="flex min-h-72 items-center justify-center rounded-3xl border border-black/5 bg-slate-50 text-center">
        <p className="font-medium text-black/45">Memuat tools terbaru...</p>
      </div>
    );
  }

  if (tools.length === 0) {
    return (
      <div className="flex min-h-72 items-center justify-center rounded-3xl border border-black/5 bg-slate-50 px-6 text-center">
        <div>
          <p className="font-medium text-black/45">Belum ada tools tersedia.</p>
          {error && <p className="mt-2 text-sm text-red-600">Katalog CMS tidak dapat dimuat. Silakan coba lagi.</p>}
        </div>
      </div>
    );
  }

  return (
    <div>
      {error && (
        <p className="mb-6 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-medium text-amber-800">
          Katalog terbaru belum dapat dimuat. Menampilkan data terakhir dari build website.
        </p>
      )}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {tools.map((tool) => {
          const Icon = getToolIcon(tool.icon);
          return (
            <a
              key={tool.id}
              href={toolHref(tool.slug, locale)}
              className="group flex min-h-64 flex-col rounded-2xl border border-black/5 bg-[#fafafa] p-7 transition duration-300 hover:-translate-y-1 hover:border-elm/30 hover:bg-white hover:shadow-xl hover:shadow-black/5"
            >
              <div
                className="mb-8 flex size-12 items-center justify-center rounded-full border border-black/5 bg-white text-xl shadow-sm"
                style={{ color: tool.color || '#1C768F' }}
              >
                <Icon size={20} strokeWidth={1.5} aria-hidden="true" />
              </div>
              <div className="mt-auto">
                <h3 className="text-xl font-bold tracking-tight text-big-stone transition-colors group-hover:text-elm">
                  {tool.name}
                </h3>
                {tool.description && (
                  <p className="mt-2 line-clamp-3 text-sm font-medium leading-relaxed text-black/50">
                    {tool.description}
                  </p>
                )}
              </div>
            </a>
          );
        })}
      </div>
    </div>
  );
}
