
import React from 'react';
import { ChevronRight } from 'lucide-react';
import { NewsInfo } from '../types';

interface NewsViewProps {
  newsList: NewsInfo[];
}

const NewsView: React.FC<NewsViewProps> = ({ newsList }) => (
  <div className="space-y-8 animate-in fade-in duration-500">
    <div>
      <h2 className="text-4xl font-black text-slate-900 tracking-tighter">Official Bulletins</h2>
      <p className="text-slate-500 font-bold text-xs uppercase tracking-widest mt-1">Verified community intelligence and faculty updates</p>
    </div>
    <div className="grid grid-cols-1 gap-10">
      {newsList.map(news => (
        <div key={news.id} className="bg-white p-12 rounded-[3rem] border border-slate-100 hover:border-orange-200 transition-all shadow-sm group flex flex-col md:flex-row gap-12">
          <div className="md:w-1/4">
             <div className="flex flex-wrap gap-2 mb-6">
                {news.tags.map(tag => (
                    <span key={tag} className="px-4 py-1.5 bg-orange-50 text-orange-700 text-[10px] rounded-xl font-black uppercase tracking-widest border border-orange-100">{tag}</span>
                  ))}
              </div>
              <p className="text-slate-400 text-[11px] font-black uppercase tracking-[0.3em]">{news.date}</p>
          </div>
          <div className="flex-1">
            <h3 className="text-3xl font-black text-slate-900 mb-6 group-hover:text-orange-600 transition-colors tracking-tight leading-none">{news.title}</h3>
            <p className="text-slate-500 font-bold leading-relaxed mb-10 text-xl">{news.content}</p>
            <button className="group/btn flex items-center gap-4 text-[11px] font-black text-orange-600 uppercase tracking-[0.2em]">
              Read Protocol
              <ChevronRight size={20} className="group-hover/btn:translate-x-1 transition-transform" />
            </button>
          </div>
        </div>
      ))}
    </div>
  </div>
);

export default NewsView;
