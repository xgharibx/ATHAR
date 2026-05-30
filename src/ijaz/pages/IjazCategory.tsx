import { Link, useParams, Navigate } from 'react-router-dom';
import { categories } from '@/ijaz/data/categories';
import { getMiraclesByCategory } from '@/ijaz/data/miracles';
import MiracleCard from '@/ijaz/components/ui/MiracleCard';
import type { MiracleCategory } from '@/ijaz/types';

export default function CategoryPage() {
  const { category: categoryId } = useParams<{ category: string }>();
  const category = categories.find((item) => item.id === categoryId);

  if (!category) {
    return <Navigate to="/ijaz" replace />;
  }

  const miraclesList = getMiraclesByCategory(category.id as MiracleCategory);

  return (
    <main className="min-h-screen" dir="rtl">
      <section className="relative h-[50vh] min-h-[350px] flex items-end overflow-hidden">
        <div
          className="absolute inset-0 z-0"
          style={{
            background: `linear-gradient(135deg, ${category.color}22 0%, rgba(10,10,15,0.92) 45%, #0a0a0f 100%)`,
          }}
        />
        <div
          className="absolute inset-0 z-0 opacity-30"
          style={{
            backgroundImage: `linear-gradient(${category.color}18 1px, transparent 1px), linear-gradient(90deg, ${category.color}18 1px, transparent 1px)`,
            backgroundSize: '44px 44px',
          }}
        />
        <div
          aria-hidden
          className="absolute inset-x-0 bottom-0 z-0 h-2/3 animate-pulse"
          style={{
            background: `linear-gradient(to top, ${category.color}24, transparent)`,
            transformOrigin: 'bottom',
          }}
        />
        <div className="absolute inset-0 z-[1] bg-gradient-to-t from-vanta via-vanta/60 to-transparent" />

        <div className="relative z-10 container mx-auto px-6 pb-12">
          <nav className="flex items-center gap-2 text-sm font-tajawal text-text-muted mb-4">
            <Link to="/ijaz" className="hover:text-gold-primary transition-colors">
              الرئيسية
            </Link>
            <span>/</span>
            <Link to="/ijaz/miracles" className="hover:text-gold-primary transition-colors">
              المعجزات
            </Link>
            <span>/</span>
            <span className="text-gold-primary">{category.nameAr}</span>
          </nav>

          <div>
            <div
              className="inline-flex items-center gap-3 px-4 py-2 rounded-xl mb-4"
              style={{ background: `${category.color}15`, border: `1px solid ${category.color}30` }}
            >
              <span className="text-3xl">{category.icon}</span>
              <div>
                <h1 className="font-amiri text-3xl md:text-4xl font-bold" style={{ color: category.color }}>
                  {category.nameAr}
                </h1>
                <p className="text-text-muted text-sm font-tajawal">{category.name}</p>
              </div>
            </div>
            <p className="text-text-secondary font-tajawal text-base max-w-2xl">
              {category.descriptionAr}
            </p>
          </div>
        </div>
      </section>

      <section className="py-16">
        <div className="container mx-auto px-6">
          <p className="text-text-muted text-sm font-tajawal mb-8">
            {miraclesList.length} معجزة في هذا القسم
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {miraclesList.map((miracle, index) => (
              <MiracleCard key={miracle.id} miracle={miracle} index={index} />
            ))}
          </div>

          {miraclesList.length === 0 && (
            <div className="text-center py-20">
              <p className="text-text-muted font-tajawal text-lg">لا توجد معجزات في هذا القسم بعد</p>
            </div>
          )}

          <div className="text-center mt-12">
            <Link
              to="/ijaz/miracles"
              className="inline-flex items-center gap-2 text-gold-primary font-tajawal hover:text-gold-light transition-colors"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="m15 18-6-6 6-6" />
              </svg>
              العودة لجميع المعجزات
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
