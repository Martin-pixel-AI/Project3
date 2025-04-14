"use client";

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Navbar from '../../../../../components/navigation/Navbar';
import Loader from '../../../../../components/ui/Loader';

export default function EditCoursePage() {
  const params = useParams();
  const router = useRouter();
  const courseId = params.id as string;
  
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  
  // Форма редактирования курса
  const [courseForm, setCourseForm] = useState({
    title: '',
    description: '',
    category: '',
    tags: '',
    thumbnail: '',
    videos: [{ _id: '', title: '', youtubeUrl: '', duration: 0, description: '' }]
  });
  
  // Загрузка данных курса
  useEffect(() => {
    const fetchCourse = async () => {
      try {
        setLoading(true);
        setError(null);
        
        const token = localStorage.getItem('token');
        if (!token) {
          router.push('/auth');
          return;
        }
        
        // Получаем полную информацию о курсе
        const response = await fetch(`/api/courses/${courseId}`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        
        const data = await response.json();
        
        if (!response.ok) {
          throw new Error(data.error || 'Не удалось загрузить данные курса');
        }
        
        // Заполняем форму данными курса
        const course = data.course;
        setCourseForm({
          title: course.title || '',
          description: course.description || '',
          category: course.category || '',
          tags: course.tags ? course.tags.join(', ') : '',
          thumbnail: course.thumbnail || '',
          videos: course.videos?.length 
            ? course.videos.map((v: any) => ({
                _id: v._id,
                title: v.title,
                youtubeUrl: v.youtubeUrl,
                duration: v.duration,
                description: v.description || ''
              }))
            : [{ _id: '', title: '', youtubeUrl: '', duration: 0, description: '' }]
        });
        
      } catch (err) {
        console.error('Error fetching course:', err);
        setError(err instanceof Error ? err.message : 'An error occurred');
      } finally {
        setLoading(false);
      }
    };
    
    fetchCourse();
  }, [courseId, router]);
  
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
      videos: [...prev.videos, { _id: '', title: '', youtubeUrl: '', duration: 0, description: '' }]
    }));
  };
  
  // Удаление видео
  const removeVideo = (index: number) => {
    const updatedVideos = [...courseForm.videos];
    updatedVideos.splice(index, 1);
    setCourseForm(prev => ({
      ...prev,
      videos: updatedVideos.length ? updatedVideos : [{ _id: '', title: '', youtubeUrl: '', duration: 0, description: '' }]
    }));
  };
  
  // Отправка формы
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setSubmitting(true);
    
    try {
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
      const response = await fetch(`/api/courses/${courseId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(formData)
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Ошибка при обновлении курса');
      }
      
      setSuccess('Курс успешно обновлен!');
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Произошла ошибка');
    } finally {
      setSubmitting(false);
    }
  };
  
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
  
  return (
    <>
      <Navbar />
      <main className="container mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold">Редактирование курса</h1>
          <button 
            onClick={() => router.push('/admin')}
            className="btn btn-secondary"
          >
            Вернуться в админпанель
          </button>
        </div>
        
        {error && (
          <div className="mb-6 p-4 bg-red-900/30 text-red-200 rounded-lg">
            {error}
          </div>
        )}
        
        {success && (
          <div className="mb-6 p-4 bg-green-900/30 text-green-200 rounded-lg">
            {success}
          </div>
        )}
        
        <div className="bg-background-light p-6 rounded-lg shadow-md">
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
            
            <div className="pt-4">
              <button 
                type="submit" 
                className="btn btn-primary w-full"
                disabled={submitting}
              >
                {submitting ? 'Сохранение...' : 'Сохранить изменения'}
              </button>
            </div>
          </form>
        </div>
      </main>
    </>
  );
} 