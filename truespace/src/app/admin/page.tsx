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
  const [createdPromoCode, setCreatedPromoCode] = useState<string | null>(null);
  
  // Состояние для статистики
  const [stats, setStats] = useState<any>(null);
  const [statsLoading, setStatsLoading] = useState(false);
  
  // Состояние для формы создания курса
  const [courseForm, setCourseForm] = useState({
    title: '',
    description: '',
    category: '',
    tags: '',
    thumbnail: '',
    videos: [{ title: '', youtubeUrl: '', duration: 0, description: '' }],
    generatePromo: false,
    customPromoCode: '',
    promoMaxUses: 10
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
  
  // Обработчик изменения видео
  const handleVideoChange = (index: number, field: string, value: string | number) => {
    const updatedVideos = [...courseForm.videos];
    updatedVideos[index] = { ...updatedVideos[index], [field]: value };
    setCourseForm(prev => ({
      ...prev,
      videos: updatedVideos
    }));
  };
  
  // Добавление нового видео
  const addVideo = () => {
    setCourseForm(prev => ({
      ...prev,
      videos: [...prev.videos, { title: '', youtubeUrl: '', duration: 0, description: '' }]
    }));
  };
  
  // Удаление видео
  const removeVideo = (index: number) => {
    const updatedVideos = [...courseForm.videos];
    updatedVideos.splice(index, 1);
    setCourseForm(prev => ({
      ...prev,
      videos: updatedVideos.length ? updatedVideos : [{ title: '', youtubeUrl: '', duration: 0, description: '' }]
    }));
  };
  
  // Обработчик отправки формы
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setSuccess(null);
    setCreatedPromoCode(null);
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
        thumbnail: '',
        videos: [{ title: '', youtubeUrl: '', duration: 0, description: '' }],
        generatePromo: false,
        customPromoCode: '',
        promoMaxUses: 10
      });
      
      setSuccess('Курс успешно создан!');
      
      // Сохраняем информацию о промокоде, если он был создан
      if (data.promoCode) {
        setCreatedPromoCode(data.promoCode.code);
      }
      
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Произошла ошибка');
    } finally {
      setFormLoading(false);
    }
  };
  
  // Загрузка статистики
  const loadStats = async () => {
    try {
      setStatsLoading(true);
      const token = localStorage.getItem('token');
      
      if (!token) {
        throw new Error('Вы не авторизованы');
      }
      
      const response = await fetch('/api/stats', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Не удалось загрузить статистику');
      }
      
      setStats(data);
    } catch (err) {
      console.error('Error loading stats:', err);
    } finally {
      setStatsLoading(false);
    }
  };
  
  // Функция для удаления курса
  const deleteCourse = async (courseId: string) => {
    try {
      setError(null);
      const token = localStorage.getItem('token');
      
      if (!token) {
        throw new Error('Вы не авторизованы');
      }
      
      console.log('Attempting to delete course:', courseId);
      
      // Show confirmation dialog with course ID
      const confirmed = confirm(`Вы уверены, что хотите удалить курс? (ID: ${courseId})`);
      if (!confirmed) {
        return;
      }
      
      const response = await fetch(`/api/courses/${courseId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      // Get response as text
      const responseText = await response.text();
      
      if (!response.ok) {
        throw new Error(responseText || `Ошибка удаления курса: ${response.status} ${response.statusText}`);
      }
      
      // Success message
      setSuccess(responseText || 'Курс успешно удален!');
      
      // Обновляем статистику после удаления
      await loadStats();
      
    } catch (err) {
      console.error('Error deleting course:', err);
      setError(err instanceof Error ? err.message : 'Произошла ошибка при удалении курса');
    }
  };
  
  // Экстренное удаление курса - вызывает специальный эндпоинт для удаления
  const emergencyDeleteCourse = async (courseId: string) => {
    try {
      setError(null);
      const token = localStorage.getItem('token');
      
      if (!token) {
        throw new Error('Вы не авторизованы');
      }
      
      // Confirm with the user that this is a potentially destructive operation
      const confirmed = window.confirm(
        'ВНИМАНИЕ: Экстренное удаление курса может привести к потере связанных данных. ' +
        'Это действие удалит курс напрямую из базы данных. Продолжить?'
      );
      
      if (!confirmed) {
        return;
      }
      
      console.log('Attempting emergency delete for course:', courseId);
      
      const response = await fetch(`/api/emergency-delete/${courseId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      const responseText = await response.text();
      
      if (!response.ok) {
        throw new Error(responseText || `Ошибка экстренного удаления: ${response.status}`);
      }
      
      setSuccess(`Экстренное удаление выполнено: ${responseText}`);
      
      // Update stats after deletion
      await loadStats();
      
    } catch (err) {
      console.error('Error in emergency delete:', err);
      setError(err instanceof Error ? err.message : 'Произошла ошибка при экстренном удалении');
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
        
        // Загружаем статистику после успешной авторизации
        await loadStats();
        
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
        
        {createdPromoCode && (
          <div className="mb-6 p-4 bg-blue-900/30 text-blue-100 rounded-lg flex items-center">
            <div className="flex-1">
              <span className="font-medium">Промокод создан:</span>{' '}
              <span className="bg-blue-900/50 px-2 py-1 rounded font-mono">{createdPromoCode}</span>
            </div>
            <button
              type="button"
              onClick={() => {
                navigator.clipboard.writeText(createdPromoCode);
                alert('Промокод скопирован в буфер обмена');
              }}
              className="ml-2 px-3 py-1 bg-blue-800 hover:bg-blue-700 rounded text-sm"
            >
              Копировать
            </button>
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
              
              <div>
                <label className="block text-sm font-medium mb-1">
                  Видео курса
                </label>
                <div className="space-y-4">
                  {courseForm.videos.map((video, index) => (
                    <div key={index} className="p-3 border border-gray-600 rounded-lg space-y-2">
                      <div className="flex justify-between">
                        <h4 className="font-medium">Видео {index + 1}</h4>
                        <button 
                          type="button"
                          onClick={() => removeVideo(index)}
                          className="text-red-400 hover:text-red-500"
                        >
                          Удалить
                        </button>
                      </div>
                      
                      <div>
                        <label className="block text-xs font-medium mb-1">
                          Название видео
                        </label>
                        <input
                          type="text"
                          value={video.title}
                          onChange={(e) => handleVideoChange(index, 'title', e.target.value)}
                          className="input w-full text-sm"
                          placeholder="Введите название видео"
                          required
                        />
                      </div>
                      
                      <div>
                        <label className="block text-xs font-medium mb-1">
                          YouTube URL
                        </label>
                        <input
                          type="url"
                          value={video.youtubeUrl}
                          onChange={(e) => handleVideoChange(index, 'youtubeUrl', e.target.value)}
                          className="input w-full text-sm"
                          placeholder="https://youtube.com/watch?v=..."
                          required
                        />
                      </div>
                      
                      <div>
                        <label className="block text-xs font-medium mb-1">
                          Длительность (в секундах)
                        </label>
                        <input
                          type="number"
                          value={video.duration}
                          onChange={(e) => handleVideoChange(index, 'duration', parseInt(e.target.value, 10) || 0)}
                          className="input w-full text-sm"
                          placeholder="300"
                          required
                          min="0"
                        />
                      </div>
                      
                      <div>
                        <label className="block text-xs font-medium mb-1">
                          Описание видео
                        </label>
                        <textarea
                          value={video.description}
                          onChange={(e) => handleVideoChange(index, 'description', e.target.value)}
                          className="input w-full text-sm"
                          placeholder="Краткое описание содержания видео"
                          rows={2}
                        />
                      </div>
                    </div>
                  ))}
                  
                  <button 
                    type="button" 
                    onClick={addVideo}
                    className="btn btn-secondary w-full"
                  >
                    + Добавить видео
                  </button>
                </div>
              </div>
              
              {/* Секция для промокода */}
              <div className="mt-8 p-4 bg-background-lighter rounded-lg">
                <div className="flex items-center mb-4">
                  <input
                    type="checkbox"
                    id="generatePromo"
                    checked={courseForm.generatePromo}
                    onChange={(e) => 
                      setCourseForm(prev => ({
                        ...prev,
                        generatePromo: e.target.checked
                      }))
                    }
                    className="h-4 w-4 rounded border-gray-600 mr-2"
                  />
                  <label htmlFor="generatePromo" className="font-medium">
                    Создать промокод для этого курса
                  </label>
                </div>
                
                {courseForm.generatePromo && (
                  <div className="space-y-3">
                    <div>
                      <label htmlFor="customPromoCode" className="block text-sm font-medium mb-1">
                        Код промокода (опционально)
                      </label>
                      <div className="flex items-center">
                        <input
                          id="customPromoCode"
                          name="customPromoCode"
                          type="text"
                          value={courseForm.customPromoCode}
                          onChange={handleFormChange}
                          className="input flex-1"
                          placeholder="Оставьте пустым для автоматической генерации"
                        />
                        <button
                          type="button"
                          onClick={() => {
                            const characters = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
                            let result = '';
                            for (let i = 0; i < 8; i++) {
                              result += characters.charAt(Math.floor(Math.random() * characters.length));
                            }
                            setCourseForm(prev => ({ ...prev, customPromoCode: result }));
                          }}
                          className="btn btn-primary ml-2"
                        >
                          Сгенерировать
                        </button>
                      </div>
                    </div>
                    
                    <div>
                      <label htmlFor="promoMaxUses" className="block text-sm font-medium mb-1">
                        Максимальное число использований
                      </label>
                      <input
                        id="promoMaxUses"
                        name="promoMaxUses"
                        type="number"
                        value={courseForm.promoMaxUses}
                        onChange={(e) => 
                          setCourseForm(prev => ({
                            ...prev,
                            promoMaxUses: parseInt(e.target.value, 10) || 1
                          }))
                        }
                        className="input w-full"
                        min="1"
                        max="1000"
                      />
                      <p className="text-xs text-text-secondary mt-1">
                        Сколько раз промокод может быть использован
                      </p>
                    </div>
                    
                    <p className="text-sm text-primary">
                      Промокод будет действовать в течение 30 дней с момента создания
                    </p>
                  </div>
                )}
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
            
            {/* Статистика */}
            <div className="mb-6">
              <h3 className="font-medium mb-3">Статистика платформы</h3>
              
              {statsLoading ? (
                <div className="flex justify-center py-4">
                  <Loader size="small" />
                </div>
              ) : stats ? (
                <div>
                  {/* Обзор */}
                  <div className="grid grid-cols-3 gap-3 mb-4">
                    <div className="p-3 bg-primary/10 rounded-lg">
                      <div className="text-sm text-text-secondary">Пользователей</div>
                      <div className="text-xl font-semibold">{stats.overview.totalUsers}</div>
                      <div className="text-xs text-text-secondary">+{stats.overview.usersToday} сегодня</div>
                    </div>
                    
                    <div className="p-3 bg-primary/10 rounded-lg">
                      <div className="text-sm text-text-secondary">Курсов</div>
                      <div className="text-xl font-semibold">{stats.overview.totalCourses}</div>
                      <div className="text-xs text-text-secondary">+{stats.overview.coursesToday} сегодня</div>
                    </div>
                    
                    <div className="p-3 bg-primary/10 rounded-lg">
                      <div className="text-sm text-text-secondary">Новых за 7 дней</div>
                      <div className="text-xl font-semibold">{stats.overview.newUsers}</div>
                      <div className="text-xs text-text-secondary">пользователей</div>
                    </div>
                  </div>
                  
                  {/* Категории */}
                  {stats.categories && stats.categories.length > 0 && (
                    <div className="mb-4">
                      <h4 className="text-sm font-medium mb-2">Популярные категории</h4>
                      <div className="space-y-1">
                        {stats.categories.map((cat: any) => (
                          <div key={cat._id} className="flex justify-between">
                            <span className="text-sm">{cat._id}</span>
                            <span className="text-sm text-text-secondary">{cat.count} курсов</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  {/* Теги */}
                  {stats.tags && stats.tags.length > 0 && (
                    <div className="mb-4">
                      <h4 className="text-sm font-medium mb-2">Популярные теги</h4>
                      <div className="flex flex-wrap gap-2">
                        {stats.tags.map((tag: any) => (
                          <span 
                            key={tag._id} 
                            className="inline-block px-2 py-1 bg-secondary/20 text-xs rounded"
                          >
                            {tag._id} ({tag.count})
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-text-secondary italic text-sm">
                  Не удалось загрузить статистику
                </div>
              )}
            </div>
            
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
        
        {/* Новая секция для списка курсов */}
        <div className="mt-8 bg-background-light p-6 rounded-lg shadow-md">
          <h2 className="text-xl font-semibold mb-4">Управление курсами</h2>
          
          <div className="course-list">
            {stats && stats.courses ? (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-background-lighter">
                    <tr>
                      <th className="p-2 text-left">Название</th>
                      <th className="p-2 text-left">Категория</th>
                      <th className="p-2 text-left">Просмотры</th>
                      <th className="p-2 text-left">Создан</th>
                      <th className="p-2 text-left">Действия</th>
                    </tr>
                  </thead>
                  <tbody>
                    {stats.courses.map((course: any) => (
                      <tr key={course._id} className="border-b border-gray-800">
                        <td className="p-2">{course.title}</td>
                        <td className="p-2">{course.category}</td>
                        <td className="p-2">{course.views || 0}</td>
                        <td className="p-2">{new Date(course.createdAt).toLocaleDateString()}</td>
                        <td className="p-2 flex space-x-2">
                          <button 
                            onClick={() => router.push(`/admin/courses/edit/${course._id}`)}
                            className="px-2 py-1 bg-blue-600 text-white rounded text-xs"
                          >
                            Редактировать
                          </button>
                          <button 
                            onClick={() => {
                              if(confirm(`Вы точно хотите удалить курс "${course.title}"?`)) {
                                deleteCourse(course._id);
                              }
                            }}
                            className="px-2 py-1 bg-red-600 text-white rounded text-xs"
                          >
                            Удалить
                          </button>
                          <button 
                            onClick={() => emergencyDeleteCourse(course._id)}
                            className="px-2 py-1 bg-yellow-500 text-black rounded text-xs"
                            title="Удаление напрямую из базы данных в случае проблем с обычным удалением"
                          >
                            Экстренно
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-text-secondary italic">Загрузка списка курсов...</p>
            )}
          </div>
        </div>
      </main>
    </>
  );
} 