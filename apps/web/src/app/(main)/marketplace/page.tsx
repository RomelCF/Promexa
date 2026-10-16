'use client';

import React, { useState, useRef, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { useAuth } from '@/lib/auth-context';

export interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  category: string;
  district: string;
  store: string;
  sellerId?: string;
  isVerified: boolean;
  status: 'Disponible' | 'Reservado';
  image: string;
  createdAt: number;
  contactPhone?: string;
}

const STORAGE_KEY_PRODUCTS = 'promexa_marketplace_products_v1';
const STORAGE_KEY_FAVORITES = 'promexa_marketplace_favorites_v1';

const PRESET_IMAGES = [
  {
    label: 'Tecnología (Audífonos)',
    url: 'https://lh3.googleusercontent.com/aida-public/AB6AXuBg21NIl8VdFPryF6IWY-blXSc13SLNb4Sl7Q9l8EWc2PLSRgFGRh0sujb6aUCKCUYPDPiOiITsYoFh-jk5Kn13VWgSeKG-xa-eUIQ_KOQZoBC4B7-zyLcvi6Jcv1PM5I-q2XaynJA_RoFH4LNb9KCKa6L4xSiHeqtQjEh4MM_aAXm1I2VFbn6GKlfDYzJOQjAwai280GrID5emqvvty-Skt8vBumoZrOc2D6TQrlo',
  },
  {
    label: 'Calzado & Moda',
    url: 'https://lh3.googleusercontent.com/aida-public/AB6AXuAtwIrPJpJDD6RZoc-kmSxoH4Q4hV8mkzGwEm3y7S-5D611CQMrt6jrg6RPNOq7wGuQuLM2zHuvjJQxwf3f8fs7YUYGlKlTZfTWaS7Odb4kCWP1L9Q2KZ1Q0UB_zMq-cP9Nt6sJDuxDYEMIo9vhXP3VF9nx1NRIks8UcRO472IQlPY4weXVMNxS2fBIfqM1_eD7sH2Hk1jNc7EUDwvDOwwAl7T3Gj508HAHytIsLd0',
  },
  {
    label: 'Muebles & Hogar',
    url: 'https://lh3.googleusercontent.com/aida-public/AB6AXuA_swiMZZIbF1o0yMzFUfJty7mqNEB2JsKwNRRCcUxW4kLP-UsTynJTDUfYZeSoh9R7CTUQYtpnT1NZh2j5b1Xf-AD-q7Ga9QVy2Snr7XVsbJbkjDxIiZOe_h_b-Dj9u9sJbTZIS8agku5KuKErkPUmd1wZLj0tvmTmVL5JKu9OQxR-RWeblxlGZfQsPd3mK49XcQmHVr2xEZWQHj9gv7hx9p31VP6qs21_UHBO-oE',
  },
  {
    label: 'Café & Alimentos',
    url: 'https://lh3.googleusercontent.com/aida-public/AB6AXuA_npRui3HeF5IBwu_Ajcn1x0E9bLy4XFPJGdraIl9GwnlE5bAA0JY7KorOti0AgsRXpVVYjQRISJe4g3shEGwpwd5vLd9_-bzqZx2-JzUvp3BlOBSw4qnhNvuNy6jqXZ1-63SDICV0Vjc81C7WZL-2mVJpx386fihVgK7PsvBIFQTcM4KlEz5DQlE72ZjD3lT0VTQokmA18XkcNhPc3rZlSPA2mGF0kMxOICPBXHM',
  },
  {
    label: 'Accesorios & Bolsos',
    url: 'https://lh3.googleusercontent.com/aida-public/AB6AXuBVxmF8dscqlLeiZaGMhVkbg-9FG2ZAtF_40174SeFo3mnxiO1fIRqnS4L14_86ec_7fw-IEMSbZC3deeelgYQzJpIXqTtxx29HsxN3Yrn7We52RvahxWzUd-bcNU3p9e-RmbSggkkWIeQm0cNmlH4_6z3EOJML_46PsgVpboNXh67lg-c2i2QIj6Zpq2rPKo7RaqaLoqFExJt_zC6YP8uyM58pz1ov1biiGipDrek',
  },
  {
    label: 'Decoración & Iluminación',
    url: 'https://lh3.googleusercontent.com/aida-public/AB6AXuAaKZFpAI2FLZnT4MHWq1gh6IefAY8q9xIyhMKRLkmD0PGdvdTl87e_RlQPC5bFk7ZzQsop4VFgfoscjnHRORss1PwMI0sa4RzYT8XJFu1hY1a3t4fmuhxzxEWN7J62x4XGURFphmbE99e8WKdQhBM0h6A7OC8J5LOllEATZ7ZyISdBVyCh6VitdledGtHRdMT8XOTsqM49BhJxDpbNfzH-16C7OzD4oflf0X4SBhA',
  },
  {
    label: 'Pastelería & Dulces',
    url: 'https://lh3.googleusercontent.com/aida-public/AB6AXuBwaVORiUPu7DaJRkXr9zT-6H768qBfTbF2Wt77Wfg_ClQAg_Lfc3b_fgjKuC_U6sbZmbWICWN5U0KferwY2PtN483DSUhcvirYIf1cRC7Wbjp19VLvO3OlbNIRwebQUgKbOiLsBbbCswu8-k0KeIxCvDN166HHT_eFyEZaKsBjytqKy1J2NjIep4FUpZT_yirJluSpXq4GyeOQtFQDw8u9joPBUM9_w7gdWQxOAOM',
  },
  {
    label: 'Cuidado Personal & Skincare',
    url: 'https://lh3.googleusercontent.com/aida-public/AB6AXuCZZEpVWZtYl9TBWZ1DeGTYcMZRuOKPlbcoVMizdnN8R7gXnKCLjx1jY0iMpKbL8pbpZmkZ8tKTn7u36B2h81-KyMR3qxqq-2aAtQ9_0N35uKnJthW-td1tZn8qNj1VrCtMj8pSepMNVivQYmKPJUEtTUxq0riHFyOOxpDAP6nv2qp2ceHuZKXA8vCE6YbiULPhLb__r9rBw4cFHv_sVT6NNNGMgQdoq4Mvjnrs0Zk',
  },
];

const INITIAL_PRODUCTS: Product[] = [
  {
    id: 'p1',
    name: 'Audífonos Bluetooth ANC Pro',
    description: 'Audífonos con cancelación activa de ruido híbrida de 40dB, 35 horas de batería continua y sonido Hi-Res. Incluye estuche rígido y cable de carga rápida tipo C.',
    price: 149,
    category: 'Tecnología',
    district: 'Miraflores',
    store: 'TechStore Perú',
    isVerified: true,
    status: 'Disponible',
    image: PRESET_IMAGES[0].url,
    createdAt: Date.now() - 1000 * 60 * 30,
    contactPhone: '+51 987 654 321',
  },
  {
    id: 'p2',
    name: 'Zapatillas Cuero Urban Classic',
    description: 'Zapatillas de cuero legítimo confeccionadas por artesanos peruanos. Suela ergonómica antideslizante y plantilla con memoria para máxima comodidad diaria.',
    price: 189,
    category: 'Moda & Calzado',
    district: 'San Isidro',
    store: 'Moda Urbana Lima',
    isVerified: false,
    status: 'Disponible',
    image: PRESET_IMAGES[1].url,
    createdAt: Date.now() - 1000 * 60 * 120,
    contactPhone: '+51 912 345 678',
  },
  {
    id: 'p3',
    name: 'Escritorio Ergonómico Roble 120cm',
    description: 'Escritorio de madera maciza de roble con estructura de acero electrostático mate. Pasacables integrado y soporte para audífonos. Ideal para home office.',
    price: 320,
    category: 'Hogar & Muebles',
    district: 'Surco',
    store: 'Muebles & Diseño',
    isVerified: true,
    status: 'Reservado',
    image: PRESET_IMAGES[2].url,
    createdAt: Date.now() - 1000 * 60 * 360,
    contactPhone: '+51 945 678 123',
  },
  {
    id: 'p4',
    name: 'Pack Cafetero Especial + Prensa',
    description: 'Cosecha fresca de café de especialidad de Villa Rica (500g, tueste medio) acompañado de prensa francesa de vidrio borosilicato de 600ml.',
    price: 85,
    category: 'Gastronomía',
    district: 'Barranco',
    store: 'Don Pedro Tostaduría',
    isVerified: true,
    status: 'Disponible',
    image: PRESET_IMAGES[3].url,
    createdAt: Date.now() - 1000 * 60 * 480,
    contactPhone: '+51 999 111 222',
  },
  {
    id: 'p5',
    name: 'Mochila Ejecutiva Anti-robo',
    description: 'Mochila impermeable con cremalleras ocultas, puerto de carga USB externo, compartimento acolchado para laptop de hasta 16" y correa para equipaje.',
    price: 119,
    category: 'Accesorios',
    district: 'San Borja',
    store: 'TravelGear Perú',
    isVerified: true,
    status: 'Disponible',
    image: PRESET_IMAGES[4].url,
    createdAt: Date.now() - 1000 * 60 * 720,
    contactPhone: '+51 988 777 666',
  },
  {
    id: 'p6',
    name: 'Lámpara de Mesa Táctil Nórdica',
    description: 'Lámpara de diseño minimalista escandinavo con base de madera natural y 3 niveles de brillo táctil regulable. Incluye bombilla LED cálida de bajo consumo.',
    price: 65,
    category: 'Hogar & Muebles',
    district: 'La Molina',
    store: 'DecoHogar',
    isVerified: false,
    status: 'Disponible',
    image: PRESET_IMAGES[5].url,
    createdAt: Date.now() - 1000 * 60 * 900,
    contactPhone: '+51 977 444 333',
  },
  {
    id: 'p7',
    name: 'Torta Suprema de Chocolate Belga',
    description: 'Elaborada artesanalmente con cacao al 70%, fudge casero y capas suaves de bizcochuelo húmedo. Rinde de 10 a 12 porciones. Pedidos con 24h de anticipación.',
    price: 55,
    category: 'Gastronomía',
    district: 'Jesús María',
    store: 'Pastelería Dulce Sabor',
    isVerified: true,
    status: 'Disponible',
    image: PRESET_IMAGES[6].url,
    createdAt: Date.now() - 1000 * 60 * 1200,
    contactPhone: '+51 966 222 888',
  },
  {
    id: 'p8',
    name: 'Pack Skincare Botánico Natural',
    description: 'Set completo de cuidado facial orgánico: sérum antioxidante de camu camu, crema hidratante de jojoba y jabón exfoliante artesanal de avena y miel.',
    price: 79,
    category: 'Servicios',
    district: 'Miraflores',
    store: 'EcoBelleza',
    isVerified: true,
    status: 'Disponible',
    image: PRESET_IMAGES[7].url,
    createdAt: Date.now() - 1000 * 60 * 1500,
    contactPhone: '+51 955 888 111',
  },
];

const CATEGORIES = [
  'Todas',
  'Tecnología',
  'Moda & Calzado',
  'Hogar & Muebles',
  'Gastronomía',
  'Servicios',
  'Accesorios',
];

const DISTRICTS = [
  'Todos los distritos',
  'Miraflores',
  'San Isidro',
  'Surco',
  'San Borja',
  'Barranco',
  'La Molina',
  'Jesús María',
  'San Miguel',
  'Pueblo Libre',
];

export default function MarketplacePage() {
  const { user } = useAuth();

  // Estados principales
  const [products, setProducts] = useState<Product[]>(INITIAL_PRODUCTS);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('Todas');
  const [selectedDistrict, setSelectedDistrict] = useState<string>('Todos los distritos');
  const [minPrice, setMinPrice] = useState<string>('');
  const [maxPrice, setMaxPrice] = useState<string>('');
  const [verifiedOnly, setVerifiedOnly] = useState(false);
  const [onlyFavorites, setOnlyFavorites] = useState(false);
  const [sortBy, setSortBy] = useState<string>('recent');
  const [favoriteIds, setFavoriteIds] = useState<{ [id: string]: boolean }>({});
  const [showSearchDropdown, setShowSearchDropdown] = useState(false);

  // Modales
  const [isPublishModalOpen, setIsPublishModalOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);

  // Formulario nuevo producto
  const [newProductName, setNewProductName] = useState('');
  const [newProductPrice, setNewProductPrice] = useState('');
  const [newProductCategory, setNewProductCategory] = useState('Tecnología');
  const [newProductDistrict, setNewProductDistrict] = useState('Miraflores');
  const [newProductDescription, setNewProductDescription] = useState('');
  const [newProductPhone, setNewProductPhone] = useState('');
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [customImageUrl, setCustomImageUrl] = useState('');
  const [isPublishing, setIsPublishing] = useState(false);

  // Toast feedback
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const carouselRef = useRef<HTMLDivElement>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  // Carga inicial y persistencia
  useEffect(() => {
    try {
      const storedProducts = localStorage.getItem(STORAGE_KEY_PRODUCTS);
      if (storedProducts) {
        const parsed = JSON.parse(storedProducts);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setProducts(parsed);
        } else {
          localStorage.setItem(STORAGE_KEY_PRODUCTS, JSON.stringify(INITIAL_PRODUCTS));
        }
      } else {
        localStorage.setItem(STORAGE_KEY_PRODUCTS, JSON.stringify(INITIAL_PRODUCTS));
      }

      const storedFavs = localStorage.getItem(STORAGE_KEY_FAVORITES);
      if (storedFavs) {
        setFavoriteIds(JSON.parse(storedFavs));
      }
    } catch (e) {
      console.error('Error loading marketplace data:', e);
    }
  }, []);

  const persistProducts = (updated: Product[]) => {
    setProducts(updated);
    try {
      localStorage.setItem(STORAGE_KEY_PRODUCTS, JSON.stringify(updated));
    } catch (e) {
      console.error('Error saving marketplace products:', e);
    }
  };

  const persistFavorites = (updatedFavs: { [id: string]: boolean }) => {
    setFavoriteIds(updatedFavs);
    try {
      localStorage.setItem(STORAGE_KEY_FAVORITES, JSON.stringify(updatedFavs));
    } catch (e) {
      console.error('Error saving marketplace favorites:', e);
    }
  };

  // Scroll del carrusel superior
  const scrollCarousel = (direction: 'left' | 'right') => {
    if (carouselRef.current) {
      const scrollAmount = direction === 'left' ? -280 : 280;
      carouselRef.current.scrollBy({ left: scrollAmount, behavior: 'smooth' });
    }
  };

  // Toggle Favorito
  const toggleFavorite = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    const updated = { ...favoriteIds, [id]: !favoriteIds[id] };
    persistFavorites(updated);
    showToast(updated[id] ? 'Producto guardado en tus favoritos ❤️' : 'Producto removido de favoritos');
  };

  // Cambiar estado de un producto (Disponible / Reservado)
  const handleToggleProductStatus = (productId: string) => {
    const updated = products.map((p) => {
      if (p.id === productId) {
        const nextStatus: 'Disponible' | 'Reservado' = p.status === 'Disponible' ? 'Reservado' : 'Disponible';
        return { ...p, status: nextStatus };
      }
      return p;
    });
    persistProducts(updated);

    if (selectedProduct && selectedProduct.id === productId) {
      setSelectedProduct({
        ...selectedProduct,
        status: selectedProduct.status === 'Disponible' ? 'Reservado' : 'Disponible',
      });
    }

    showToast('Estado del producto actualizado');
  };

  // Eliminar un producto
  const handleDeleteProduct = (productId: string) => {
    if (confirm('¿Estás seguro de que deseas eliminar este producto del marketplace?')) {
      const updated = products.filter((p) => p.id !== productId);
      persistProducts(updated);
      setSelectedProduct(null);
      showToast('Producto eliminado del Marketplace');
    }
  };

  // Publicar nuevo producto
  const handleCreateProduct = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProductName.trim()) {
      showToast('Por favor escribe el nombre del producto');
      return;
    }
    const parsedPrice = parseFloat(newProductPrice);
    if (isNaN(parsedPrice) || parsedPrice <= 0) {
      showToast('Ingresa un precio válido mayor a 0');
      return;
    }

    setIsPublishing(true);

    const imageUrl = customImageUrl.trim() || PRESET_IMAGES[selectedImageIndex].url;
    const storeName = user?.name || 'Mi Negocio Promexa';

    const newProduct: Product = {
      id: `prod-${Date.now()}`,
      name: newProductName.trim(),
      description: newProductDescription.trim() || 'Producto disponible en Promexa. Coordinación directa y segura con el vendedor.',
      price: parsedPrice,
      category: newProductCategory,
      district: newProductDistrict,
      store: storeName,
      sellerId: user?.id,
      isVerified: user?.isVerified ?? true,
      status: 'Disponible',
      image: imageUrl,
      createdAt: Date.now(),
      contactPhone: newProductPhone.trim() || '+51 999 888 777',
    };

    const updated = [newProduct, ...products];
    persistProducts(updated);

    setIsPublishing(false);
    setIsPublishModalOpen(false);

    // Reset form
    setNewProductName('');
    setNewProductPrice('');
    setNewProductDescription('');
    setNewProductPhone('');
    setCustomImageUrl('');
    setSelectedImageIndex(0);

    showToast('¡Tu producto ha sido publicado exitosamente en el Marketplace!');
  };

  // Limpiar todos los filtros
  const handleClearFilters = () => {
    setSearchQuery('');
    setSelectedCategory('Todas');
    setSelectedDistrict('Todos los distritos');
    setMinPrice('');
    setMaxPrice('');
    setVerifiedOnly(false);
    setOnlyFavorites(false);
    setSortBy('recent');
    showToast('Filtros restablecidos');
  };

  // Filtrado y ordenamiento de productos
  const filteredProducts = useMemo(() => {
    return products
      .filter((p) => {
        // Búsqueda por texto (nombre, descripción, tienda o categoría)
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase();
          const matchName = p.name.toLowerCase().includes(q);
          const matchDesc = p.description.toLowerCase().includes(q);
          const matchStore = p.store.toLowerCase().includes(q);
          const matchCat = p.category.toLowerCase().includes(q);
          if (!matchName && !matchDesc && !matchStore && !matchCat) return false;
        }

        // Categoría
        if (selectedCategory !== 'Todas' && p.category !== selectedCategory) {
          return false;
        }

        // Distrito
        if (selectedDistrict !== 'Todos los distritos' && p.district !== selectedDistrict) {
          return false;
        }

        // Negocios verificados
        if (verifiedOnly && !p.isVerified) {
          return false;
        }

        // Solo favoritos
        if (onlyFavorites && !favoriteIds[p.id]) {
          return false;
        }

        // Rango de precio
        const min = parseFloat(minPrice);
        if (!isNaN(min) && p.price < min) {
          return false;
        }
        const max = parseFloat(maxPrice);
        if (!isNaN(max) && p.price > max) {
          return false;
        }

        return true;
      })
      .sort((a, b) => {
        if (sortBy === 'price-asc') return a.price - b.price;
        if (sortBy === 'price-desc') return b.price - a.price;
        if (sortBy === 'name-asc') return a.name.localeCompare(b.name);
        // Default: más recientes
        return b.createdAt - a.createdAt;
      });
  }, [
    products,
    searchQuery,
    selectedCategory,
    selectedDistrict,
    verifiedOnly,
    onlyFavorites,
    minPrice,
    maxPrice,
    sortBy,
    favoriteIds,
  ]);

  // Conteo dinámico por categoría
  const categoryCounts = useMemo(() => {
    const counts: { [cat: string]: number } = { Todas: products.length };
    products.forEach((p) => {
      counts[p.category] = (counts[p.category] || 0) + 1;
    });
    return counts;
  }, [products]);

  return (
    <div className="max-w-7xl mx-auto px-4 py-6">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-on-surface text-surface px-4 py-3 rounded-xl shadow-2xl flex items-center gap-2.5 animate-fadeIn border border-outline-variant/30 text-body-md font-body-md">
          <span className="material-symbols-outlined text-primary text-[20px]">check_circle</span>
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Header Bar con Búsqueda, Ordenamiento y CTA */}
      <div className="bg-surface-container-lowest rounded-xl p-4 mb-6 shadow-sm flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4 border border-surface-container/60">
        {/* Barra de Búsqueda con Sugerencias */}
        <div className="relative flex-1 max-w-xl">
          <div className="relative flex items-center w-full">
            <span className="material-symbols-outlined absolute left-3.5 text-outline text-[20px] pointer-events-none">
              search
            </span>
            <input
              className="w-full h-11 pl-11 pr-10 bg-surface-container-lowest rounded-lg border border-outline-variant/40 font-body-md text-body-md text-on-surface placeholder:text-outline focus:outline-none focus:bg-surface-container-low focus:border-primary-container transition-all"
              placeholder="Buscar por producto, marca, tienda o categoría..."
              type="text"
              value={searchQuery}
              onFocus={() => setShowSearchDropdown(true)}
              onBlur={() => setTimeout(() => setShowSearchDropdown(false), 200)}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            {searchQuery ? (
              <button
                className="absolute right-3 text-outline hover:text-on-surface flex items-center justify-center p-1"
                type="button"
                onClick={() => setSearchQuery('')}
                title="Limpiar búsqueda"
              >
                <span className="material-symbols-outlined text-[18px]">close</span>
              </button>
            ) : (
              <span className="absolute right-3 text-outline flex items-center justify-center pointer-events-none">
                <span className="material-symbols-outlined text-[18px]">tune</span>
              </span>
            )}
          </div>

          {/* Autocompletado / Búsquedas populares */}
          {showSearchDropdown && (
            <div className="absolute top-12 left-0 right-0 bg-surface-container-lowest rounded-xl shadow-xl z-30 p-2 space-y-1 border border-outline-variant/30 animate-fadeIn">
              <div className="px-3 py-2 text-label-sm font-label-sm text-outline uppercase tracking-wider flex items-center justify-between">
                <span>Búsquedas populares</span>
                <span className="text-[11px] normal-case">Toca para filtrar</span>
              </div>
              <button
                className="w-full text-left flex items-center gap-2.5 px-3 py-2 rounded-lg hover:bg-surface-container font-body-md text-body-md text-on-surface transition-colors"
                type="button"
                onMouseDown={() => setSearchQuery('Audífonos bluetooth')}
              >
                <span className="material-symbols-outlined text-[18px] text-primary">trending_up</span>
                <span>Audífonos bluetooth con cancelación de ruido</span>
              </button>
              <button
                className="w-full text-left flex items-center gap-2.5 px-3 py-2 rounded-lg hover:bg-surface-container font-body-md text-body-md text-on-surface transition-colors"
                type="button"
                onMouseDown={() => setSearchQuery('Café')}
              >
                <span className="material-symbols-outlined text-[18px] text-primary">trending_up</span>
                <span>Café especial de Villa Rica orgánico</span>
              </button>
              <button
                className="w-full text-left flex items-center gap-2.5 px-3 py-2 rounded-lg hover:bg-surface-container font-body-md text-body-md text-on-surface transition-colors"
                type="button"
                onMouseDown={() => setSearchQuery('Escritorio')}
              >
                <span className="material-symbols-outlined text-[18px] text-primary">trending_up</span>
                <span>Escritorios ergonómicos de roble</span>
              </button>
              <button
                className="w-full text-left flex items-center gap-2.5 px-3 py-2 rounded-lg hover:bg-surface-container font-body-md text-body-md text-on-surface transition-colors"
                type="button"
                onMouseDown={() => setSearchQuery('Zapatillas')}
              >
                <span className="material-symbols-outlined text-[18px] text-primary">trending_up</span>
                <span>Zapatillas de cuero hechas en Lima</span>
              </button>
            </div>
          )}
        </div>

        {/* Controles de la derecha: Ordenar y Botón Publicar Producto */}
        <div className="flex items-center gap-3 shrink-0 flex-wrap sm:flex-nowrap">
          {/* Toggle Mis Favoritos */}
          <button
            type="button"
            className={`h-11 px-3.5 rounded-lg border font-body-md-medium text-body-md-medium flex items-center gap-2 transition-colors ${
              onlyFavorites
                ? 'bg-red-50 border-red-300 text-red-600 font-semibold'
                : 'bg-surface-container-low border-transparent text-on-surface-variant hover:bg-surface-container'
            }`}
            onClick={() => setOnlyFavorites(!onlyFavorites)}
            title="Ver solo productos guardados"
          >
            <span
              className={`material-symbols-outlined text-[18px] ${onlyFavorites ? 'text-red-500' : ''}`}
              style={{ fontVariationSettings: onlyFavorites ? "'FILL' 1" : "'FILL' 0" }}
            >
              favorite
            </span>
            <span className="hidden sm:inline">Favoritos</span>
            {Object.values(favoriteIds).filter(Boolean).length > 0 && (
              <span className="px-1.5 py-0.2 rounded-full bg-red-100 text-red-700 text-caption font-caption">
                {Object.values(favoriteIds).filter(Boolean).length}
              </span>
            )}
          </button>

          {/* Selector de ordenamiento funcional */}
          <div className="relative inline-block w-full sm:w-auto">
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="w-full sm:w-auto h-11 pl-3.5 pr-9 bg-surface-container-low hover:bg-surface-container text-on-surface font-body-md-medium text-body-md-medium rounded-lg appearance-none cursor-pointer focus:outline-none transition-colors"
            >
              <option value="recent">Ordenar por: Más recientes</option>
              <option value="price-asc">Precio: Menor a mayor</option>
              <option value="price-desc">Precio: Mayor a menor</option>
              <option value="name-asc">Nombre: A a Z</option>
            </select>
            <span className="material-symbols-outlined absolute right-2.5 top-1/2 -translate-y-1/2 text-outline pointer-events-none text-[20px]">
              expand_more
            </span>
          </div>

          {/* Botón Publicar Producto que abre el modal funcional */}
          <button
            className="w-full sm:w-auto h-11 px-5 rounded-lg bg-[#F28C28] hover:bg-[#e07b1b] text-on-primary font-body-md-medium text-body-md-medium flex items-center justify-center gap-2 shadow-sm transition-all active:scale-95 shrink-0 font-semibold cursor-pointer"
            type="button"
            onClick={() => setIsPublishModalOpen(true)}
          >
            <span className="material-symbols-outlined text-[20px] font-bold">add</span>
            <span>Publicar producto</span>
          </button>
        </div>
      </div>

      {/* Layout Principal: Sidebar de Filtros + Catálogo */}
      <div className="flex flex-col lg:flex-row gap-6 items-start">
        {/* SIDEBAR IZQUIERDA: Filtros Interactivos */}
        <aside className="w-full lg:w-[270px] shrink-0 bg-surface-container-lowest rounded-xl p-5 shadow-sm space-y-6 border border-surface-container/60">
          <div className="flex items-center justify-between pb-3 bg-surface-container-low -mx-5 -mt-5 p-4 rounded-t-xl">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-primary text-[20px]">filter_list</span>
              <h2 className="font-headline-sm text-headline-sm text-on-surface text-[16px] leading-[22px] font-semibold">
                Filtros
              </h2>
            </div>
            <button
              className="font-label-sm text-label-sm text-primary hover:underline transition-colors font-medium cursor-pointer"
              type="button"
              onClick={handleClearFilters}
            >
              Limpiar filtros
            </button>
          </div>

          {/* Filtro por Categorías con conteos dinámicos */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="font-body-md-medium text-body-md-medium text-on-surface font-semibold">
                Categorías
              </span>
              <span className="text-caption text-outline font-caption">
                {selectedCategory !== 'Todas' ? selectedCategory : 'Todas'}
              </span>
            </div>
            <div className="space-y-1.5 pl-0.5">
              {CATEGORIES.map((cat) => {
                const isSelected = selectedCategory === cat;
                const count = categoryCounts[cat] || 0;
                return (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setSelectedCategory(cat)}
                    className={`w-full flex items-center justify-between text-body-md font-body-md px-2.5 py-1.5 rounded-lg transition-colors cursor-pointer text-left ${
                      isSelected
                        ? 'bg-primary/10 text-primary font-semibold'
                        : 'text-on-surface-variant hover:bg-surface-container hover:text-on-surface'
                    }`}
                  >
                    <span className="flex items-center gap-2 truncate">
                      <span
                        className={`w-2 h-2 rounded-full ${
                          isSelected ? 'bg-primary' : 'bg-transparent'
                        }`}
                      />
                      <span>{cat}</span>
                    </span>
                    <span
                      className={`font-label-sm text-label-sm px-2 py-0.5 rounded-full ${
                        isSelected
                          ? 'bg-primary text-on-primary font-bold'
                          : 'bg-surface-container text-outline'
                      }`}
                    >
                      {count}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="h-px bg-surface-container" />

          {/* Rango de Precios Funcional */}
          <div className="space-y-3">
            <span className="font-body-md-medium text-body-md-medium text-on-surface font-semibold block">
              Rango de precio (S/)
            </span>
            <div className="grid grid-cols-2 gap-2">
              <div className="bg-surface-container-low rounded-lg p-2.5 border border-surface-container">
                <span className="font-caption text-caption text-outline block mb-0.5">Mínimo</span>
                <div className="flex items-center text-body-md font-body-md-medium text-on-surface">
                  <span className="text-outline text-label-sm mr-1">S/</span>
                  <input
                    value={minPrice}
                    onChange={(e) => setMinPrice(e.target.value)}
                    placeholder="0"
                    className="w-full bg-transparent focus:outline-none text-on-surface font-body-md-medium"
                    type="number"
                    min="0"
                  />
                </div>
              </div>
              <div className="bg-surface-container-low rounded-lg p-2.5 border border-surface-container">
                <span className="font-caption text-caption text-outline block mb-0.5">Máximo</span>
                <div className="flex items-center text-body-md font-body-md-medium text-on-surface">
                  <span className="text-outline text-label-sm mr-1">S/</span>
                  <input
                    value={maxPrice}
                    onChange={(e) => setMaxPrice(e.target.value)}
                    placeholder="500"
                    className="w-full bg-transparent focus:outline-none text-on-surface font-body-md-medium"
                    type="number"
                    min="0"
                  />
                </div>
              </div>
            </div>
            {(minPrice || maxPrice) && (
              <button
                type="button"
                onClick={() => {
                  setMinPrice('');
                  setMaxPrice('');
                }}
                className="text-caption text-primary hover:underline font-caption"
              >
                Quitar filtro de precio
              </button>
            )}
          </div>

          <div className="h-px bg-surface-container" />

          {/* Selector de Distrito Funcional */}
          <div className="space-y-2">
            <span className="font-body-md-medium text-body-md-medium text-on-surface font-semibold block">
              Ubicación / Distrito
            </span>
            <div className="relative">
              <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-outline text-[18px] pointer-events-none">
                location_on
              </span>
              <select
                value={selectedDistrict}
                onChange={(e) => setSelectedDistrict(e.target.value)}
                className="w-full h-10 pl-9 pr-8 bg-surface-container-low hover:bg-surface-container text-on-surface font-body-md text-body-md rounded-lg appearance-none cursor-pointer focus:outline-none transition-colors border border-surface-container"
              >
                {DISTRICTS.map((dist) => (
                  <option key={dist} value={dist}>
                    {dist}
                  </option>
                ))}
              </select>
              <span className="material-symbols-outlined absolute right-2.5 top-1/2 -translate-y-1/2 text-outline pointer-events-none text-[18px]">
                expand_more
              </span>
            </div>
          </div>

          <div className="h-px bg-surface-container" />

          {/* Toggle: Negocios verificados */}
          <div className="bg-surface-container-low p-3 rounded-lg flex items-center justify-between gap-2 border border-surface-container">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-full bg-primary-container text-on-primary flex items-center justify-center shrink-0">
                <span className="material-symbols-outlined text-[14px]">verified</span>
              </div>
              <div className="flex flex-col">
                <span className="font-label-md text-label-md text-on-surface font-medium">
                  Negocios verificados
                </span>
                <span className="font-caption text-caption text-outline">Solo perfiles con RUC</span>
              </div>
            </div>
            <button
              className={`relative w-11 h-6 rounded-full transition-colors cursor-pointer shrink-0 focus:outline-none ${
                verifiedOnly ? 'bg-primary-container' : 'bg-surface-variant'
              }`}
              type="button"
              onClick={() => setVerifiedOnly(!verifiedOnly)}
              title={verifiedOnly ? 'Ver todos los comercios' : 'Filtrar solo comercios verificados'}
            >
              <span
                className={`absolute top-1 w-4 h-4 rounded-full bg-on-primary transition-all shadow-sm ${
                  verifiedOnly ? 'left-6' : 'left-1'
                }`}
              />
            </button>
          </div>
        </aside>

        {/* CONTENIDO DERECHA: Carrusel + Catálogo */}
        <section className="flex-1 min-w-0 space-y-6 w-full">
          {/* Carrusel de Recomendados para ti */}
          <div className="bg-surface-container-lowest rounded-xl p-5 shadow-sm space-y-4 border border-surface-container/60">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                  <span className="material-symbols-outlined text-[22px]">auto_awesome</span>
                </div>
                <div>
                  <h3 className="font-headline-sm text-headline-sm text-on-surface text-[17px] leading-tight font-semibold">
                    Recomendado para ti
                  </h3>
                  <p className="font-caption text-caption text-outline">
                    Basado en tu actividad y comercios locales en Lima (ML Service)
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-1.5">
                <button
                  className="w-8 h-8 rounded-full bg-surface-container-low hover:bg-surface-container flex items-center justify-center text-on-surface-variant transition-colors cursor-pointer"
                  type="button"
                  onClick={() => scrollCarousel('left')}
                  title="Anterior"
                >
                  <span className="material-symbols-outlined text-[18px]">chevron_left</span>
                </button>
                <button
                  className="w-8 h-8 rounded-full bg-surface-container-low hover:bg-surface-container flex items-center justify-center text-on-surface-variant transition-colors cursor-pointer"
                  type="button"
                  onClick={() => scrollCarousel('right')}
                  title="Siguiente"
                >
                  <span className="material-symbols-outlined text-[18px]">chevron_right</span>
                </button>
              </div>
            </div>

            {/* Horizontal Track de Recomendaciones */}
            <div
              ref={carouselRef}
              className="flex gap-4 overflow-x-auto pb-2 scroll-smooth no-scrollbar"
            >
              {products.slice(0, 6).map((item) => (
                <div
                  key={`rec-${item.id}`}
                  onClick={() => setSelectedProduct(item)}
                  className="w-60 shrink-0 bg-surface-container-low rounded-xl overflow-hidden hover:shadow-md hover:-translate-y-0.5 transition-all cursor-pointer group border border-surface-container/60"
                >
                  <div className="relative h-28 w-full bg-surface-variant overflow-hidden">
                    <img
                      alt={item.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      src={item.image}
                    />
                    <span className="absolute top-2 left-2 bg-surface-container-lowest/90 backdrop-blur-sm px-2 py-0.5 rounded-full font-label-sm text-label-sm text-primary font-medium">
                      {item.category}
                    </span>
                  </div>
                  <div className="p-3">
                    <p className="font-body-md-medium text-body-md-medium text-on-surface truncate font-semibold">
                      {item.name}
                    </p>
                    <div className="flex items-center justify-between mt-1">
                      <span className="font-headline-sm text-headline-sm text-primary font-bold text-[15px]">
                        S/ {item.price.toFixed(2)}
                      </span>
                      <span className="font-caption text-caption text-on-surface-variant bg-surface-container px-1.5 py-0.5 rounded">
                        {item.district}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Barra de Estado y Resultados Activos */}
          <div className="flex items-center justify-between px-1 flex-wrap gap-2">
            <div className="flex items-center gap-2 text-body-md font-body-md text-on-surface">
              <span className="font-bold text-on-surface">{filteredProducts.length}</span>
              <span className="text-on-surface-variant">productos encontrados</span>
              {(selectedCategory !== 'Todas' ||
                selectedDistrict !== 'Todos los distritos' ||
                searchQuery ||
                verifiedOnly ||
                onlyFavorites) && (
                <span className="text-caption text-outline">
                  (Filtros activos)
                </span>
              )}
            </div>

            {/* Pills de filtros aplicados para remover rápido */}
            <div className="flex items-center gap-2 flex-wrap">
              {selectedCategory !== 'Todas' && (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-surface-container text-caption font-caption text-on-surface">
                  {selectedCategory}
                  <button
                    onClick={() => setSelectedCategory('Todas')}
                    className="hover:text-red-600"
                  >
                    ×
                  </button>
                </span>
              )}
              {selectedDistrict !== 'Todos los distritos' && (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-surface-container text-caption font-caption text-on-surface">
                  {selectedDistrict}
                  <button
                    onClick={() => setSelectedDistrict('Todos los distritos')}
                    className="hover:text-red-600"
                  >
                    ×
                  </button>
                </span>
              )}
            </div>
          </div>

          {/* Grilla Principal de Productos (Responsive) */}
          {filteredProducts.length === 0 ? (
            <div className="bg-surface-container-lowest rounded-xl p-12 text-center border border-dashed border-outline-variant/60 space-y-4">
              <div className="w-16 h-16 mx-auto rounded-full bg-surface-container flex items-center justify-center text-outline">
                <span className="material-symbols-outlined text-[32px]">inventory_2</span>
              </div>
              <div>
                <h4 className="font-headline-sm text-headline-sm text-on-surface font-semibold">
                  No se encontraron productos
                </h4>
                <p className="font-body-md text-body-md text-outline mt-1 max-w-md mx-auto">
                  Prueba cambiando los términos de búsqueda o limpiando los filtros para ver más productos disponibles.
                </p>
              </div>
              <button
                type="button"
                onClick={handleClearFilters}
                className="px-4 py-2 rounded-lg bg-primary-container text-on-primary font-body-md-medium text-body-md-medium hover:bg-primary transition-colors cursor-pointer"
              >
                Restablecer todos los filtros
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
              {filteredProducts.map((product) => (
                <article
                  key={product.id}
                  onClick={() => setSelectedProduct(product)}
                  className="bg-surface-container-lowest rounded-xl overflow-hidden shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 flex flex-col group relative border border-surface-container/60 cursor-pointer"
                >
                  {/* Imagen y badges */}
                  <div className="relative w-full aspect-square bg-surface-container-low overflow-hidden">
                    <img
                      alt={product.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      src={product.image}
                    />

                    {/* Badge de Disponibilidad */}
                    <div className="absolute top-3 left-3 flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-surface-container-lowest/95 backdrop-blur-sm shadow-sm">
                      <span
                        className={`w-2 h-2 rounded-full ${
                          product.status === 'Disponible' ? 'bg-[#16A34A]' : 'bg-[#D97706]'
                        }`}
                      />
                      <span
                        className={`font-label-sm text-label-sm font-semibold ${
                          product.status === 'Disponible' ? 'text-[#16A34A]' : 'text-[#D97706]'
                        }`}
                      >
                        {product.status}
                      </span>
                    </div>

                    {/* Botón de Favorito */}
                    <button
                      aria-label="Guardar producto"
                      className={`absolute top-3 right-3 w-8 h-8 rounded-full bg-surface-container-lowest/95 backdrop-blur-sm flex items-center justify-center shadow-sm transition-colors cursor-pointer ${
                        favoriteIds[product.id] ? 'text-[#DC2626]' : 'text-outline hover:text-[#DC2626]'
                      }`}
                      type="button"
                      onClick={(e) => toggleFavorite(e, product.id)}
                    >
                      <span
                        className="material-symbols-outlined text-[18px]"
                        style={{
                          fontVariationSettings: favoriteIds[product.id] ? "'FILL' 1" : "'FILL' 0",
                        }}
                      >
                        favorite
                      </span>
                    </button>

                    {/* Badge de Categoría */}
                    <span className="absolute bottom-2 left-2 bg-on-surface/75 text-surface px-2 py-0.5 rounded text-caption font-caption backdrop-blur-xs">
                      {product.category}
                    </span>
                  </div>

                  {/* Info del Producto */}
                  <div className="p-3.5 flex flex-col flex-1 justify-between gap-3">
                    <div>
                      <div className="flex items-baseline justify-between gap-1 mb-1">
                        <span className="font-headline-sm text-headline-sm text-on-surface text-[19px] font-bold">
                          S/ {product.price.toFixed(2)}
                        </span>
                        <span className="font-caption text-caption text-outline bg-surface-container-low px-1.5 py-0.5 rounded">
                          {product.district}
                        </span>
                      </div>
                      <h4 className="font-body-md-medium text-body-md-medium text-on-surface line-clamp-1 group-hover:text-primary transition-colors font-medium">
                        {product.name}
                      </h4>
                      <p className="font-caption text-caption text-on-surface-variant line-clamp-2 mt-1">
                        {product.description}
                      </p>
                    </div>

                    <div className="flex items-center justify-between pt-2 border-t border-surface-container">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <span className="material-symbols-outlined text-outline text-[16px] shrink-0">
                          storefront
                        </span>
                        <span className="font-label-sm text-label-sm text-on-surface-variant truncate">
                          {product.store}
                        </span>
                        {product.isVerified && (
                          <span
                            className="material-symbols-outlined text-primary-container text-[15px] shrink-0"
                            style={{ fontVariationSettings: "'FILL' 1" }}
                            title="Negocio Verificado con RUC"
                          >
                            verified
                          </span>
                        )}
                      </div>

                      {/* Botón de Contacto Rápido */}
                      <Link
                        href={`/mensajes?store=${encodeURIComponent(product.store)}&product=${encodeURIComponent(product.name)}`}
                        onClick={(e) => e.stopPropagation()}
                        className="text-primary hover:text-on-primary-fixed-variant p-1.5 rounded-lg hover:bg-surface-container transition-colors"
                        title="Contactar al vendedor por chat"
                      >
                        <span className="material-symbols-outlined text-[20px]">
                          chat_bubble_outline
                        </span>
                      </Link>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      </div>

      {/* ========================================================================= */}
      {/* MODAL 1: PUBLICAR NUEVO PRODUCTO */}
      {/* ========================================================================= */}
      {isPublishModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fadeIn">
          <div
            className="bg-surface-container-lowest rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl border border-surface-container p-6 space-y-5 animate-scaleUp"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-surface-container pb-4">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-xl bg-[#F28C28]/10 text-[#F28C28] flex items-center justify-center">
                  <span className="material-symbols-outlined text-[24px]">storefront</span>
                </div>
                <div>
                  <h3 className="font-headline-sm text-headline-sm text-on-surface font-bold text-[18px]">
                    Publicar producto en el Marketplace
                  </h3>
                  <p className="font-caption text-caption text-outline">
                    Llega a miles de compradores y vecinos en Lima
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsPublishModalOpen(false)}
                className="w-8 h-8 rounded-full hover:bg-surface-container flex items-center justify-center text-outline transition-colors cursor-pointer"
              >
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>

            <form onSubmit={handleCreateProduct} className="space-y-4">
              {/* Nombre y Precio */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="sm:col-span-2 space-y-1.5">
                  <label className="font-body-md-medium text-body-md-medium text-on-surface font-semibold block">
                    Nombre del producto *
                  </label>
                  <input
                    required
                    type="text"
                    value={newProductName}
                    onChange={(e) => setNewProductName(e.target.value)}
                    placeholder="Ej. Mochila Ergonómica Impermeable"
                    className="w-full h-11 px-3.5 bg-surface-container-low rounded-lg border border-outline-variant/50 focus:outline-none focus:bg-surface-container-lowest focus:border-primary font-body-md text-on-surface"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="font-body-md-medium text-body-md-medium text-on-surface font-semibold block">
                    Precio (S/) *
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-outline font-semibold">
                      S/
                    </span>
                    <input
                      required
                      type="number"
                      step="0.10"
                      min="1"
                      value={newProductPrice}
                      onChange={(e) => setNewProductPrice(e.target.value)}
                      placeholder="0.00"
                      className="w-full h-11 pl-9 pr-3 bg-surface-container-low rounded-lg border border-outline-variant/50 focus:outline-none focus:bg-surface-container-lowest focus:border-primary font-body-md text-on-surface font-semibold"
                    />
                  </div>
                </div>
              </div>

              {/* Categoría y Distrito */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="font-body-md-medium text-body-md-medium text-on-surface font-semibold block">
                    Categoría *
                  </label>
                  <select
                    value={newProductCategory}
                    onChange={(e) => setNewProductCategory(e.target.value)}
                    className="w-full h-11 px-3 bg-surface-container-low rounded-lg border border-outline-variant/50 focus:outline-none font-body-md text-on-surface cursor-pointer"
                  >
                    {CATEGORIES.filter((c) => c !== 'Todas').map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="font-body-md-medium text-body-md-medium text-on-surface font-semibold block">
                    Distrito de Lima *
                  </label>
                  <select
                    value={newProductDistrict}
                    onChange={(e) => setNewProductDistrict(e.target.value)}
                    className="w-full h-11 px-3 bg-surface-container-low rounded-lg border border-outline-variant/50 focus:outline-none font-body-md text-on-surface cursor-pointer"
                  >
                    {DISTRICTS.filter((d) => d !== 'Todos los distritos').map((d) => (
                      <option key={d} value={d}>
                        {d}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Descripción */}
              <div className="space-y-1.5">
                <label className="font-body-md-medium text-body-md-medium text-on-surface font-semibold block">
                  Descripción del producto o servicio
                </label>
                <textarea
                  rows={3}
                  value={newProductDescription}
                  onChange={(e) => setNewProductDescription(e.target.value)}
                  placeholder="Detalles de la oferta, características, tallas, condiciones de entrega..."
                  className="w-full p-3 bg-surface-container-low rounded-lg border border-outline-variant/50 focus:outline-none focus:bg-surface-container-lowest focus:border-primary font-body-md text-on-surface resize-none"
                />
              </div>

              {/* Teléfono / WhatsApp de contacto */}
              <div className="space-y-1.5">
                <label className="font-body-md-medium text-body-md-medium text-on-surface font-semibold block">
                  WhatsApp / Teléfono para coordinar pedido
                </label>
                <input
                  type="text"
                  value={newProductPhone}
                  onChange={(e) => setNewProductPhone(e.target.value)}
                  placeholder="+51 987 654 321"
                  className="w-full h-11 px-3.5 bg-surface-container-low rounded-lg border border-outline-variant/50 focus:outline-none font-body-md text-on-surface"
                />
              </div>

              {/* Selección de Foto */}
              <div className="space-y-2">
                <label className="font-body-md-medium text-body-md-medium text-on-surface font-semibold block">
                  Selecciona una imagen representativa
                </label>
                <div className="grid grid-cols-4 sm:grid-cols-8 gap-2">
                  {PRESET_IMAGES.map((img, idx) => (
                    <button
                      key={img.label}
                      type="button"
                      onClick={() => {
                        setSelectedImageIndex(idx);
                        setCustomImageUrl('');
                      }}
                      className={`relative aspect-square rounded-lg overflow-hidden border-2 transition-all cursor-pointer ${
                        selectedImageIndex === idx && !customImageUrl
                          ? 'border-primary ring-2 ring-primary/30 scale-105'
                          : 'border-transparent opacity-70 hover:opacity-100'
                      }`}
                    >
                      <img src={img.url} alt={img.label} className="w-full h-full object-cover" />
                    </button>
                  ))}
                </div>
                <div className="pt-1">
                  <input
                    type="url"
                    value={customImageUrl}
                    onChange={(e) => setCustomImageUrl(e.target.value)}
                    placeholder="O pega una URL de imagen personalizada (https://...)"
                    className="w-full h-10 px-3 bg-surface-container-low rounded-lg border border-outline-variant/50 text-caption font-caption focus:outline-none"
                  />
                </div>
              </div>

              {/* Botones de acción */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-surface-container">
                <button
                  type="button"
                  onClick={() => setIsPublishModalOpen(false)}
                  className="h-11 px-5 rounded-lg border border-surface-container text-on-surface-variant hover:bg-surface-container font-body-md-medium text-body-md-medium transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isPublishing}
                  className="h-11 px-6 rounded-lg bg-[#F28C28] hover:bg-[#e07b1b] text-on-primary font-body-md-medium text-body-md-medium shadow-md transition-all active:scale-95 font-semibold flex items-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  <span className="material-symbols-outlined text-[20px]">publish</span>
                  <span>{isPublishing ? 'Publicando...' : 'Publicar producto'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 2: DETALLE DEL PRODUCTO & COORDINACIÓN DIRECTA */}
      {/* ========================================================================= */}
      {selectedProduct && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn"
          onClick={() => setSelectedProduct(null)}
        >
          <div
            className="bg-surface-container-lowest rounded-2xl w-full max-w-3xl max-h-[92vh] overflow-y-auto shadow-2xl border border-surface-container p-6 animate-scaleUp space-y-6"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header del Modal */}
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="flex items-center gap-2 flex-wrap mb-1">
                  <span className="px-2.5 py-0.5 rounded-full bg-primary/10 text-primary text-label-sm font-label-sm font-semibold">
                    {selectedProduct.category}
                  </span>
                  <span
                    className={`px-2.5 py-0.5 rounded-full text-label-sm font-label-sm font-semibold ${
                      selectedProduct.status === 'Disponible'
                        ? 'bg-green-100 text-green-700'
                        : 'bg-amber-100 text-amber-700'
                    }`}
                  >
                    ● {selectedProduct.status}
                  </span>
                  <span className="text-caption text-outline flex items-center gap-1 font-caption">
                    <span className="material-symbols-outlined text-[16px]">location_on</span>
                    {selectedProduct.district}, Lima
                  </span>
                </div>
                <h2 className="font-headline-sm text-headline-sm text-on-surface text-[22px] font-bold">
                  {selectedProduct.name}
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setSelectedProduct(null)}
                className="w-9 h-9 rounded-full hover:bg-surface-container flex items-center justify-center text-outline transition-colors cursor-pointer shrink-0"
              >
                <span className="material-symbols-outlined text-[22px]">close</span>
              </button>
            </div>

            {/* Cuerpo del Modal: Foto y Datos */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
              <div className="relative aspect-square rounded-xl overflow-hidden bg-surface-container-low border border-surface-container">
                <img
                  src={selectedProduct.image}
                  alt={selectedProduct.name}
                  className="w-full h-full object-cover"
                />
              </div>

              <div className="space-y-4">
                {/* Precio Prominente */}
                <div className="p-4 rounded-xl bg-surface-container-low border border-surface-container">
                  <span className="font-caption text-caption text-outline block">Precio de venta</span>
                  <div className="flex items-baseline gap-2">
                    <span className="text-[30px] font-bold text-primary">
                      S/ {selectedProduct.price.toFixed(2)}
                    </span>
                    <span className="font-caption text-caption text-outline">PEN / unidad</span>
                  </div>
                </div>

                {/* Info Vendedor */}
                <div className="p-3.5 rounded-xl border border-surface-container flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold">
                      <span className="material-symbols-outlined text-[20px]">storefront</span>
                    </div>
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="font-body-md-medium text-body-md-medium text-on-surface font-semibold">
                          {selectedProduct.store}
                        </span>
                        {selectedProduct.isVerified && (
                          <span
                            className="material-symbols-outlined text-primary text-[16px]"
                            title="Comercio Verificado Promexa"
                          >
                            verified
                          </span>
                        )}
                      </div>
                      <span className="font-caption text-caption text-outline">
                        {selectedProduct.district} · Ventas seguras en Promexa
                      </span>
                    </div>
                  </div>
                </div>

                {/* Descripción */}
                <div className="space-y-1.5">
                  <h4 className="font-body-md-medium text-body-md-medium text-on-surface font-semibold">
                    Descripción del producto
                  </h4>
                  <p className="font-body-md text-body-md text-on-surface-variant leading-relaxed">
                    {selectedProduct.description}
                  </p>
                </div>

                {/* Botones de acción y coordinación */}
                <div className="pt-3 space-y-2.5">
                  <Link
                    href={`/mensajes?store=${encodeURIComponent(selectedProduct.store)}&product=${encodeURIComponent(selectedProduct.name)}`}
                    className="w-full h-12 rounded-xl bg-[#F28C28] hover:bg-[#e07b1b] text-on-primary font-body-md-medium text-body-md-medium font-semibold flex items-center justify-center gap-2 shadow-md transition-all active:scale-95"
                  >
                    <span className="material-symbols-outlined text-[20px]">chat</span>
                    <span>Coordinar pedido con el vendedor</span>
                  </Link>

                  {/* Acciones de gestión para el vendedor */}
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => handleToggleProductStatus(selectedProduct.id)}
                      className="flex-1 h-10 rounded-lg bg-surface-container-low hover:bg-surface-container text-on-surface font-label-md text-label-md font-medium transition-colors flex items-center justify-center gap-1.5 border border-surface-container cursor-pointer"
                    >
                      <span className="material-symbols-outlined text-[18px]">
                        {selectedProduct.status === 'Disponible' ? 'check_circle' : 'schedule'}
                      </span>
                      <span>
                        Cambiar a {selectedProduct.status === 'Disponible' ? 'Reservado' : 'Disponible'}
                      </span>
                    </button>

                    <button
                      type="button"
                      onClick={(e) => toggleFavorite(e, selectedProduct.id)}
                      className={`h-10 px-3.5 rounded-lg border transition-colors flex items-center justify-center cursor-pointer ${
                        favoriteIds[selectedProduct.id]
                          ? 'bg-red-50 border-red-200 text-red-600'
                          : 'bg-surface-container-low border-surface-container text-outline hover:text-red-600'
                      }`}
                      title="Guardar en favoritos"
                    >
                      <span
                        className="material-symbols-outlined text-[20px]"
                        style={{
                          fontVariationSettings: favoriteIds[selectedProduct.id] ? "'FILL' 1" : "'FILL' 0",
                        }}
                      >
                        favorite
                      </span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleDeleteProduct(selectedProduct.id)}
                      className="h-10 px-3 rounded-lg border border-surface-container text-outline hover:text-red-600 hover:bg-red-50 transition-colors flex items-center justify-center cursor-pointer"
                      title="Eliminar producto"
                    >
                      <span className="material-symbols-outlined text-[18px]">delete</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
