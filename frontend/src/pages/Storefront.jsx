import React, { useState, useEffect } from 'react';
import { Sparkles, ShieldCheck, Heart, Leaf, ChevronRight, ChevronLeft, ArrowRight, Star, RefreshCw } from 'lucide-react';
import { ProductCard } from '../components/ProductCard';
import { ProductDetailModal } from '../components/ProductDetailModal';

const HERO_SLIDES = [
  {
    image: '/assets/images/hero1.jpg.png',
    tag: 'Botanical Radiance',
    title: 'Transformative Skincare for Luminous Skin',
    subtitle: 'Nourishing botanical elixirs, gentle cleansers, and protecting shields created for timeless youth.',
    cta: 'Shop Collections',
  },
  {
    image: '/assets/images/hero2.jpg.png',
    tag: 'Daily Rituals',
    title: 'Balancing Toners & Protective Sunscreens',
    subtitle: 'Formulated with bio-compatible organic nutrients that hydrate and strengthen your moisture barrier.',
    cta: 'Discover Rituals',
  },
  {
    image: '/assets/images/hero3.jpg.png',
    tag: 'Complete Regimen',
    title: 'Curated All-in-One Skincare Packages',
    subtitle: 'Everything your skin craves in harmony. Experience the full synergy of Jammaila-skin essentials.',
    cta: 'Explore Bundles',
  },
];

const DEFAULT_SAMPLE_PRODUCTS = [
  {
    id: 101,
    name: 'Gentle Botanical Cleanser',
    category: 'Cleanser',
    price: 380.00,
    stock: 25,
    imageUrl: '/assets/images/hero1.jpg.png',
    description: 'A mild botanical cleanser with soothing chamomile and aloe vera that purifies without stripping skin natural moisture.',
    usage: 'Pump 1-2 times onto wet hands, massage gently over face for 60 seconds, and rinse with lukewarm water.',
    productType: 'STANDARD'
  },
  {
    id: 102,
    name: 'Hydrating Petal Toner',
    category: 'Toner',
    price: 450.00,
    stock: 18,
    imageUrl: '/assets/images/hero2.jpg.png',
    description: 'Balancing alcohol-free botanical toner formulated with rose extracts and hyaluronic acid to lock in hydration.',
    usage: 'After cleansing, pour onto palms or cotton pad and gently pat into skin until fully absorbed.',
    productType: 'STANDARD'
  },
  {
    id: 103,
    name: 'Ultra UV Daily Shield SPF 50+',
    category: 'Sunscreen',
    price: 520.00,
    stock: 30,
    imageUrl: '/assets/images/hero3.jpg.png',
    description: 'Invisible, lightweight non-greasy broad spectrum SPF 50+ PA++++ with zero white cast and nourishing botanical antioxidants.',
    usage: 'Apply liberally 15 minutes before sun exposure as the final step in your morning routine. Reapply every 2 hours.',
    productType: 'STANDARD'
  },
  {
    id: 104,
    name: 'Radiance Botanical Glow Serum',
    category: 'Serum',
    price: 650.00,
    stock: 12,
    imageUrl: '/assets/images/hero1.jpg.png',
    description: 'High-potency botanical brightening serum infused with vitamin C and niacinamide to even skin tone and boost glow.',
    usage: 'Apply 3-4 drops directly to cleansed skin morning and evening before creams.',
    productType: 'STANDARD'
  },
  {
    id: 105,
    name: 'Complete Radiance Package (Full Set)',
    category: 'Packages',
    price: 1850.00,
    stock: 8,
    imageUrl: '/assets/images/hero2.jpg.png',
    description: 'The complete 4-step daily ritual bundle: Cleanser, Petal Toner, Glow Serum, and UV Shield with special bundle savings.',
    usage: 'Follow the 4-step ritual sequentially: Cleanse, Tone, Treat with Serum, Protect with Sunscreen.',
    productType: 'PACKAGE',
    packageItems: [
      { name: 'Gentle Botanical Cleanser', qty: 1 },
      { name: 'Hydrating Petal Toner', qty: 1 },
      { name: 'Radiance Botanical Glow Serum', qty: 1 },
      { name: 'Ultra UV Daily Shield SPF 50+', qty: 1 }
    ]
  }
];

export const Storefront = () => {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [activeTab, setActiveTab] = useState('All');
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedProduct, setSelectedProduct] = useState(null);

  // Auto advance hero slider
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % HERO_SLIDES.length);
    }, 6000);
    return () => clearInterval(timer);
  }, []);

  // Fetch products from backend
  const fetchProducts = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/products');
      if (!res.ok) throw new Error('Failed to load products');
      const data = await res.json();
      const list = Array.isArray(data) ? data : (Array.isArray(data?.products) ? data.products : []);
      if (list.length > 0) {
        setProducts(list);
      } else {
        setProducts(DEFAULT_SAMPLE_PRODUCTS);
      }
    } catch {
      // Fallback gracefully so shop never looks broken
      setProducts(DEFAULT_SAMPLE_PRODUCTS);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, []);

  const categories = ['All', 'Cleanser', 'Toner', 'Sunscreen', 'Serum', 'Packages'];

  const filteredProducts = products.filter((p) => {
    if (activeTab === 'All') return true;
    if (activeTab === 'Packages') {
      return String(p.productType || '').toUpperCase() === 'PACKAGE' || String(p.category || '').toLowerCase().includes('package');
    }
    return String(p.category || '').toLowerCase() === activeTab.toLowerCase();
  });

  return (
    <div className="min-h-screen bg-[#faf8f5]">
      {/* Hero Slider Section */}
      <section className="relative h-[540px] sm:h-[620px] lg:h-[680px] w-full overflow-hidden bg-[#1b2420]">
        {HERO_SLIDES.map((slide, idx) => (
          <div
            key={idx}
            className={`absolute inset-0 transition-opacity duration-1000 ease-in-out ${
              idx === currentSlide ? 'opacity-100 z-10' : 'opacity-0 z-0'
            }`}
          >
            {/* Background image with luxury overlay */}
            <img
              src={slide.image}
              alt={slide.title}
              className="w-full h-full object-cover object-center filter brightness-[0.72]"
            />
            <div className="absolute inset-0 bg-gradient-to-r from-black/85 via-black/50 to-transparent" />

            {/* Slide Content */}
            <div className="absolute inset-0 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center">
              <div className="max-w-xl text-white space-y-4 sm:space-y-6">
                <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/10 backdrop-blur-md border border-white/20 text-[#deb35c] text-xs font-bold tracking-widest uppercase">
                  <Sparkles size={13} />
                  <span>{slide.tag}</span>
                </div>
                <h1 className="font-serif text-3xl sm:text-5xl lg:text-6xl font-bold leading-tight tracking-tight text-white">
                  {slide.title}
                </h1>
                <p className="text-sm sm:text-base text-gray-200 leading-relaxed max-w-lg">
                  {slide.subtitle}
                </p>
                <div className="pt-2 flex items-center gap-4">
                  <a
                    href="#catalog"
                    className="btn btn-gold px-7 py-3.5 text-sm sm:text-base font-bold shadow-lg flex items-center gap-2"
                  >
                    <span>{slide.cta}</span>
                    <ArrowRight size={18} />
                  </a>
                  <a
                    href="#about"
                    className="btn bg-white/15 hover:bg-white/25 text-white backdrop-blur-md px-6 py-3.5 text-sm font-semibold border border-white/20"
                  >
                    Our Story
                  </a>
                </div>
              </div>
            </div>
          </div>
        ))}

        {/* Slide navigation controls */}
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-20 flex items-center gap-2">
          {HERO_SLIDES.map((_, idx) => (
            <button
              key={idx}
              onClick={() => setCurrentSlide(idx)}
              className={`h-2 rounded-full transition-all duration-300 ${
                idx === currentSlide ? 'w-8 bg-[#c49a45]' : 'w-2 bg-white/50 hover:bg-white'
              }`}
              aria-label={`Go to slide ${idx + 1}`}
            />
          ))}
        </div>

        <button
          onClick={() => setCurrentSlide((prev) => (prev === 0 ? HERO_SLIDES.length - 1 : prev - 1))}
          className="absolute left-4 top-1/2 -translate-y-1/2 z-20 p-2.5 rounded-full bg-black/30 hover:bg-black/60 text-white backdrop-blur-sm transition-all"
        >
          <ChevronLeft size={22} />
        </button>
        <button
          onClick={() => setCurrentSlide((prev) => (prev + 1) % HERO_SLIDES.length)}
          className="absolute right-4 top-1/2 -translate-y-1/2 z-20 p-2.5 rounded-full bg-black/30 hover:bg-black/60 text-white backdrop-blur-sm transition-all"
        >
          <ChevronRight size={22} />
        </button>
      </section>

      {/* Brand Value Propositions Bar */}
      <section className="bg-white border-b border-[#235848]/10 py-6 sm:py-8 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
          <div className="flex flex-col items-center space-y-1">
            <div className="w-10 h-10 rounded-full bg-[#e9f2ee] text-[#235848] flex items-center justify-center mb-1">
              <Leaf size={20} />
            </div>
            <h4 className="font-bold text-xs sm:text-sm text-[#1b2420]">Botanical Actives</h4>
            <p className="text-[11px] text-[#63706a]">Gentle, non-irritating extracts</p>
          </div>

          <div className="flex flex-col items-center space-y-1">
            <div className="w-10 h-10 rounded-full bg-[#e9f2ee] text-[#235848] flex items-center justify-center mb-1">
              <ShieldCheck size={20} />
            </div>
            <h4 className="font-bold text-xs sm:text-sm text-[#1b2420]">100% Authentic</h4>
            <p className="text-[11px] text-[#63706a]">Direct formulation guarantee</p>
          </div>

          <div className="flex flex-col items-center space-y-1">
            <div className="w-10 h-10 rounded-full bg-[#e9f2ee] text-[#235848] flex items-center justify-center mb-1">
              <Sparkles size={20} />
            </div>
            <h4 className="font-bold text-xs sm:text-sm text-[#1b2420]">J&T Express Courier</h4>
            <p className="text-[11px] text-[#63706a]">Fast nationwide Philippine delivery</p>
          </div>

          <div className="flex flex-col items-center space-y-1">
            <div className="w-10 h-10 rounded-full bg-[#e9f2ee] text-[#235848] flex items-center justify-center mb-1">
              <Heart size={20} />
            </div>
            <h4 className="font-bold text-xs sm:text-sm text-[#1b2420]">Cruelty Free</h4>
            <p className="text-[11px] text-[#63706a]">Clean, ethical beauty care</p>
          </div>
        </div>
      </section>

      {/* Catalog & Shop Section */}
      <section id="catalog" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-24">
        <div className="text-center max-w-2xl mx-auto mb-10 space-y-3">
          <span className="text-xs uppercase tracking-widest font-bold text-[#c49a45]">
            Curated Formulations
          </span>
          <h2 className="font-serif text-3xl sm:text-4xl font-bold text-[#1b2420]">
            The Botanical Collection
          </h2>
          <p className="text-sm text-[#63706a]">
            Each formula is crafted to restore balance, support hydration, and reveal natural skin luminosity.
          </p>
        </div>

        {/* Category Tabs */}
        <div id="categories" className="flex items-center justify-center flex-wrap gap-2 sm:gap-3 mb-10">
          {categories.map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-5 py-2.5 rounded-full text-xs sm:text-sm font-semibold transition-all ${
                activeTab === tab
                  ? 'bg-[#235848] text-white shadow-md shadow-[#235848]/20'
                  : 'bg-white text-[#63706a] hover:text-[#1b2420] border border-[#235848]/10 hover:bg-[#faf8f5]'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* Products Grid */}
        {loading ? (
          <div className="py-20 flex flex-col items-center justify-center space-y-3">
            <RefreshCw className="animate-spin text-[#235848]" size={32} />
            <p className="text-sm text-[#63706a]">Loading formulations...</p>
          </div>
        ) : filteredProducts.length === 0 ? (
          <div className="text-center py-20 bg-white rounded-2xl border border-gray-100 p-8">
            <p className="text-sm text-gray-500">No products found in this category.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 sm:gap-8">
            {filteredProducts.map((product) => (
              <ProductCard
                key={product.id}
                product={product}
                onQuickView={(p) => setSelectedProduct(p)}
              />
            ))}
          </div>
        )}
      </section>

      {/* Brand Philosophy Section */}
      <section id="about" className="bg-[#1b2420] text-white py-20 sm:py-28 overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          <div className="space-y-6">
            <span className="text-xs uppercase tracking-widest font-bold text-[#deb35c]">
              Pure botanical craftsmanship
            </span>
            <h2 className="font-serif text-3xl sm:text-5xl font-bold leading-tight">
              Honoring your skin's natural balance with earth's purest elements.
            </h2>
            <p className="text-gray-300 text-sm sm:text-base leading-relaxed">
              At Jammaila-skin, we believe true radiance stems from healthy, nourished skin cells. Our small-batch formulations combine revered botanical extracts with scientifically validated humectants and broad-spectrum photoprotection.
            </p>
            <div className="grid grid-cols-2 gap-6 pt-4 border-t border-white/10">
              <div>
                <span className="block font-serif text-3xl font-bold text-[#deb35c]">100%</span>
                <span className="text-xs text-gray-300">Authentic Botanical Formulas</span>
              </div>
              <div>
                <span className="block font-serif text-3xl font-bold text-[#deb35c]">0%</span>
                <span className="text-xs text-gray-300">Harsh Sulfates &amp; Parabens</span>
              </div>
            </div>
          </div>

          <div className="relative">
            <div className="relative z-10 rounded-2xl overflow-hidden shadow-2xl border border-white/10">
              <img
                src="/assets/images/hero2.jpg.png"
                alt="Philosophy bottle"
                className="w-full h-80 sm:h-96 object-cover"
              />
            </div>
            <div className="absolute -top-6 -right-6 w-48 h-48 bg-[#c49a45]/20 rounded-full blur-3xl -z-0" />
            <div className="absolute -bottom-6 -left-6 w-48 h-48 bg-[#235848]/40 rounded-full blur-3xl -z-0" />
          </div>
        </div>
      </section>

      {/* Testimonials / Social Proof */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-24">
        <div className="text-center max-w-xl mx-auto mb-12 space-y-2">
          <span className="text-xs uppercase tracking-widest font-bold text-[#c49a45]">
            Verified Customer Stories
          </span>
          <h2 className="font-serif text-3xl font-bold text-[#1b2420]">Loved Across the Philippines</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white p-6 rounded-2xl border border-[#235848]/10 shadow-sm space-y-4">
            <div className="flex text-[#c49a45] gap-1">
              {[...Array(5)].map((_, i) => (
                <Star key={i} size={16} fill="currentColor" />
              ))}
            </div>
            <p className="text-sm text-gray-700 italic">
              "The Gentle Botanical Cleanser completely stopped my redness without drying my skin out. Super fast J&T delivery too!"
            </p>
            <div className="text-xs font-bold text-[#235848]">— Maria C., Cebu City</div>
          </div>

          <div className="bg-white p-6 rounded-2xl border border-[#235848]/10 shadow-sm space-y-4">
            <div className="flex text-[#c49a45] gap-1">
              {[...Array(5)].map((_, i) => (
                <Star key={i} size={16} fill="currentColor" />
              ))}
            </div>
            <p className="text-sm text-gray-700 italic">
              "The Complete Radiance Package bundle is so worth it! My skin is visibly brighter and the sunscreen has zero white cast."
            </p>
            <div className="text-xs font-bold text-[#235848]">— Angela P., Quezon City</div>
          </div>

          <div className="bg-white p-6 rounded-2xl border border-[#235848]/10 shadow-sm space-y-4">
            <div className="flex text-[#c49a45] gap-1">
              {[...Array(5)].map((_, i) => (
                <Star key={i} size={16} fill="currentColor" />
              ))}
            </div>
            <p className="text-sm text-gray-700 italic">
              "I love the transparent order tracking feature. Payment via GCash was seamless and customer support was very helpful."
            </p>
            <div className="text-xs font-bold text-[#235848]">— Beatrice L., Davao</div>
          </div>
        </div>
      </section>

      {/* Quick Modal for Product Details */}
      <ProductDetailModal
        product={selectedProduct}
        isOpen={Boolean(selectedProduct)}
        onClose={() => setSelectedProduct(null)}
      />
    </div>
  );
};
