import React from 'react';
import {
  Mail,
  Award,
  Briefcase,
  GraduationCap,
  Folder,
  ArrowRight,
  Plus,
  Zap,
  DollarSign,
  Code,
  Star,
  Sparkles,
  Layers,
  Tag,
  Bell,
  Flame,
  Clock,
  Key,
  ShieldCheck,
  Lock,
  Shield,
  GripHorizontal,
} from 'lucide-react';
import { CustomCategory } from '../../types';
import { MailCategoryType, getCategoryTheme, DEFAULT_CUSTOM_CATEGORIES } from '../../utils/categoryClassifier';

export interface CategoryStats {
  total: number;
  urgent: number;
  important: number;
  priorityCount: number;
  recentCount: number;
}

const ICON_MAP: Record<string, React.ReactNode> = {
  Mail: <Mail className="w-5 h-5" />,
  Award: <Award className="w-5 h-5" />,
  Briefcase: <Briefcase className="w-5 h-5" />,
  GraduationCap: <GraduationCap className="w-5 h-5" />,
  Folder: <Folder className="w-5 h-5" />,
  Zap: <Zap className="w-5 h-5" />,
  DollarSign: <DollarSign className="w-5 h-5" />,
  Code: <Code className="w-5 h-5" />,
  Star: <Star className="w-5 h-5" />,
  Sparkles: <Sparkles className="w-5 h-5" />,
  Layers: <Layers className="w-5 h-5" />,
  Tag: <Tag className="w-5 h-5" />,
  Bell: <Bell className="w-5 h-5" />,
  Flame: <Flame className="w-5 h-5" />,
  Key: <Key className="w-5 h-5" />,
  ShieldCheck: <ShieldCheck className="w-5 h-5" />,
  Lock: <Lock className="w-5 h-5" />,
  Shield: <Shield className="w-5 h-5" />,
};

interface MailCategoryCardsProps {
  categories?: CustomCategory[];
  stats: Record<string, CategoryStats>;
  activeCategory: 'all' | MailCategoryType;
  activeSubView?: 'all' | 'priority' | 'recent';
  onSelectCategory: (category: MailCategoryType) => void;
  onSelectCategoryAndSubView?: (category: MailCategoryType, subView: 'all' | 'priority' | 'recent') => void;
  onOpenManageCategories?: () => void;
  onReorderCategories?: (newCategories: CustomCategory[]) => void;
}

export const MailCategoryCards: React.FC<MailCategoryCardsProps> = ({
  categories = DEFAULT_CUSTOM_CATEGORIES,
  stats,
  activeCategory,
  activeSubView = 'all',
  onSelectCategory,
  onSelectCategoryAndSubView,
  onOpenManageCategories,
  onReorderCategories,
}) => {
  const [draggedCatId, setDraggedCatId] = React.useState<string | null>(null);
  const [dragOverCatId, setDragOverCatId] = React.useState<string | null>(null);

  const handleCategoryClick = (catId: string) => {
    onSelectCategory(catId);
  };

  const handleDragStart = (e: React.DragEvent, catId: string) => {
    e.dataTransfer.setData('text/plain', catId);
    e.dataTransfer.effectAllowed = 'move';
    setDraggedCatId(catId);
  };

  const handleDragOver = (e: React.DragEvent, catId: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (dragOverCatId !== catId) {
      setDragOverCatId(catId);
    }
  };

  const handleDragLeave = (catId: string) => {
    if (dragOverCatId === catId) {
      setDragOverCatId(null);
    }
  };

  const handleDrop = (e: React.DragEvent, targetCatId: string) => {
    e.preventDefault();
    if (!draggedCatId || draggedCatId === targetCatId) {
      setDraggedCatId(null);
      setDragOverCatId(null);
      return;
    }

    const updated = [...categories];
    const fromIdx = updated.findIndex((c) => c.id === draggedCatId);
    const toIdx = updated.findIndex((c) => c.id === targetCatId);

    if (fromIdx !== -1 && toIdx !== -1 && fromIdx !== toIdx) {
      const [moved] = updated.splice(fromIdx, 1);
      updated.splice(toIdx, 0, moved);
      if (onReorderCategories) {
        onReorderCategories(updated);
      }
    }

    setDraggedCatId(null);
    setDragOverCatId(null);
  };

  const handleDragEnd = () => {
    setDraggedCatId(null);
    setDragOverCatId(null);
  };

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 xl:grid-cols-6 gap-3.5">
      {categories.map((cat, idx) => {
        const isSelected = activeCategory === cat.id;
        const isDragging = draggedCatId === cat.id;
        const isDragOver = dragOverCatId === cat.id;
        const catStats = stats[cat.id] || { total: 0, urgent: 0, important: 0, priorityCount: 0, recentCount: 0 };
        const themeTokens = getCategoryTheme(cat.color);
        const iconNode = ICON_MAP[cat.icon || ''] || <Tag className="w-5 h-5" />;
        const staggerClass = `stagger-${Math.min(idx + 1, 10)}`;

        return (
          <div
            key={cat.id}
            draggable
            onDragStart={(e) => handleDragStart(e, cat.id)}
            onDragOver={(e) => handleDragOver(e, cat.id)}
            onDragLeave={() => handleDragLeave(cat.id)}
            onDrop={(e) => handleDrop(e, cat.id)}
            onDragEnd={handleDragEnd}
            onClick={() => handleCategoryClick(cat.id)}
            className={`p-4 rounded-2xl bg-white dark:bg-[#12141c] border transition-all duration-200 select-none flex flex-col justify-between group relative overflow-hidden cursor-grab active:cursor-grabbing interactive-card animate-fade-in-up ${staggerClass} ${
              isDragging
                ? 'opacity-40 scale-95 border-dashed border-blue-400 dark:border-orange-500 shadow-inner'
                : isDragOver
                ? 'border-blue-500 dark:border-orange-500 ring-4 ring-blue-300 dark:ring-orange-950 scale-[1.03] shadow-lg'
                : isSelected
                ? 'border-blue-500 dark:border-orange-500 ring-2 ring-blue-200 dark:ring-orange-500/30 dark:bg-[#161824] shadow-md -translate-y-0.5'
                : 'border-slate-200/80 dark:border-[#1e2230] hover:border-slate-300 dark:hover:border-[#2a2f40] dark:hover:bg-[#161824] hover:shadow-card-lift'
            }`}
            title="Click to filter • Drag to reorder"
          >
            {/* Grip handle indicator */}
            <div className="absolute top-2.5 right-2.5 opacity-0 group-hover:opacity-60 transition-opacity text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
              <GripHorizontal className="w-3.5 h-3.5" />
            </div>

            <div>
              <div className="flex items-center justify-between mb-2.5">
                <div
                  className={`w-9 h-9 rounded-xl border flex items-center justify-center transition-all duration-200 group-hover:scale-110 group-hover:rotate-3 ${themeTokens.bg} ${themeTokens.text} ${themeTokens.border}`}
                >
                  {iconNode}
                </div>
                <div className="text-base font-bold text-slate-900 dark:text-slate-100 font-sans pr-4 transition-transform group-hover:translate-x-0.5">
                  {catStats.total} <span className="text-xs font-normal text-slate-400">Emails</span>
                </div>
              </div>

              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 group-hover:text-blue-600 dark:group-hover:text-orange-400 transition-colors duration-150">
                  {cat.name}
                </h3>
              </div>

              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 truncate" title={cat.description}>
                {cat.description}
              </p>
            </div>
          </div>
        );
      })}
    </div>
  );
};

