"use client";

import { Metadata } from 'next';
import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Navbar from '../../components/navigation/Navbar';
import Loader from '../../components/ui/Loader';

export default function AdminPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  
  // Состояние для формы создания курса
  const [courseForm, setCourseForm] = useState({
    title: '',
    description: '',
    category: '',
    tags: '',
    thumbnail: ''
  });
  const [formLoading, setFormLoading] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  
  // Обработчик изменения полей формы
  const handleFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setCourseForm(prev => ({
      ...prev,
      [name]: value
    }));
  };
  
  // Обработчик отправки формы
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setSuccess(null);
    setFormLoading(true);
    
    try {
      // Получаем токен из localStorage
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('Вы не авторизованы');
      }
      
      // Подготавливаем данные
      const formData = {
        ...courseForm,
        tags: courseForm.tags.split(',').map(tag => tag.trim()).filter(tag => tag)
      };
      
      // Отправляем запрос
      const response = await fetch('/api/courses', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(formData)
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Ошибка при создании курса');
      }
      
      // Очищаем форму после успешного создания
      setCourseForm({
        title: '',
        description: '',
        category: '',
        tags: '',
        thumbnail: ''
      });
      
      setSuccess('Курс успешно создан!');
      
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Произошла ошибка');
    } finally {
      setFormLoading(false);
    }
  };
  
  // Check admin auth
  useEffect(() => {
    const checkAuth = async () => {
      try {
        setLoading(true);
        
        const token = localStorage.getItem('token');
        
        if (!token) {
          // Redirect to login if not logged in
          router.push('/auth');
          return;
        }
        
        // Проверка роли администратора
        const response = await fetch('/api/user/me', {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        
        const data = await response.json();
        
        if (!response.ok || data.type !== 'admin') {
          router.push('/'); // Перенаправляем на главную, если пользователь не админ
          return;
        }
        
      } catch (err) {
        console.error('Error checking admin auth:', err);
        setError(err instanceof Error ? err.message : 'An error occurred');
      } finally {
        setLoading(false);
      }
    };
    
    checkAuth();
  }, [router]);
  
  if (loading) {
    return (
      <>
        <Navbar />
        <main className="container mx-auto px-4 py-8">
          <div className="flex justify-center py-16">
            <Loader size="large" />
          </div>
        </main>
      </>
    );
  }
  
  if (error) {
    return (
      <>
        <Navbar />
        <main className="container mx-auto px-4 py-8">
          <div className="p-4 bg-red-900/30 text-red-200 rounded-lg">
            {error}
          </div>
        </main>
      </>
    );
  }
  
  return (
    <>
      <Navbar />
      <main className="container mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold mb-6">Панель Администратора</h1>
        
        {success && (
          <div className="mb-6 p-4 bg-green-900/30 text-green-200 rounded-lg">
            {success}
          </div>
        )}
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Форма создания курса */}
          <div className="bg-background-light p-6 rounded-lg shadow-md">
            <h2 className="text-xl font-semibold mb-4">Создать новый курс</h2>
            
            {formError && (
              <div className="mb-4 p-3 bg-red-900/30 text-red-200 rounded-lg">
                {formError}
              </div>
            )}
            
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label htmlFor="title" className="block text-sm font-medium mb-1">
                  Название курса *
                </label>
                <input
                  id="title"
                  name="title"
                  type="text"
                  value={courseForm.title}
                  onChange={handleFormChange}
                  className="input w-full"
                  required
                />
              </div>
              
              <div>
                <label htmlFor="description" className="block text-sm font-medium mb-1">
                  Описание курса *
                </label>
                <textarea
                  id="description"
                  name="description"
                  value={courseForm.description}
                  onChange={handleFormChange}
                  className="input w-full h-32"
                  required
                />
              </div>
              
              <div>
                <label htmlFor="category" className="block text-sm font-medium mb-1">
                  Категория *
                </label>
                <select
                  id="category"
                  name="category"
                  value={courseForm.category}
                  onChange={handleFormChange}
                  className="input w-full"
                  required
                >
                  <option value="">Выберите категорию</option>
                  <option value="Программирование">Программирование</option>
                  <option value="Дизайн">Дизайн</option>
                  <option value="Бизнес">Бизнес</option>
                  <option value="Маркетинг">Маркетинг</option>
                  <option value="Образование">Образование</option>
                </select>
              </div>
              
              <div>
                <label htmlFor="tags" className="block text-sm font-medium mb-1">
                  Теги (через запятую)
                </label>
                <input
                  id="tags"
                  name="tags"
                  type="text"
                  value={courseForm.tags}
                  onChange={handleFormChange}
                  className="input w-full"
                  placeholder="например: javascript, веб-разработка"
                />
              </div>
              
              <div>
                <label htmlFor="thumbnail" className="block text-sm font-medium mb-1">
                  URL изображения
                </label>
                <input
                  id="thumbnail"
                  name="thumbnail"
                  type="url"
                  value={courseForm.thumbnail}
                  onChange={handleFormChange}
                  className="input w-full"
                  placeholder="https://example.com/image.jpg"
                />
              </div>
              
              <button 
                type="submit" 
                className="btn btn-primary w-full"
                disabled={formLoading}
              >
                {formLoading ? 'Создание...' : 'Создать курс'}
              </button>
            </form>
          </div>
          
          {/* Информационная панель */}
          <div className="bg-background-light p-6 rounded-lg shadow-md">
            <h2 className="text-xl font-semibold mb-4">Управление платформой</h2>
            <p className="text-text-secondary mb-6">
              Дополнительные функции для администраторов:
            </p>
            
            <ul className="list-disc pl-5 space-y-2 text-text-secondary">
              <li>Управление видео (добавление, редактирование, удаление)</li>
              <li>Управление пользователями</li>
              <li>Генерация и отслеживание промо-кодов</li>
              <li>Статистика и аналитика</li>
            </ul>
            
            <div className="mt-8">
              <h3 className="font-medium mb-2">Последние действия:</h3>
              <div className="text-sm text-text-secondary italic">
                Здесь будет отображаться лог действий администратора
              </div>
            </div>
          </div>
        </div>
      </main>
    </>
  );
} 