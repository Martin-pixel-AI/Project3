"use client";

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Navbar from '../../../components/navigation/Navbar';

export default function TestDeletePage() {
  const router = useRouter();
  const [courseId, setCourseId] = useState('');
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [courses, setCourses] = useState<any[]>([]);
  
  // Load available courses to test
  useEffect(() => {
    const fetchCourses = async () => {
      try {
        const token = localStorage.getItem('token');
        if (!token) {
          setError('Not authenticated');
          return;
        }
        
        const response = await fetch('/api/stats', {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        
        if (!response.ok) {
          throw new Error('Failed to fetch courses');
        }
        
        const data = await response.json();
        if (data.courses && Array.isArray(data.courses)) {
          setCourses(data.courses);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred');
      }
    };
    
    fetchCourses();
  }, []);
  
  const testFindCourse = async () => {
    if (!courseId) {
      setError('Please enter or select a course ID');
      return;
    }
    
    setResult(null);
    setError(null);
    
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        setError('Not authenticated');
        return;
      }
      
      const response = await fetch(`/api/test-delete/${courseId}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      const text = await response.text();
      
      if (!response.ok) {
        setError(`Error (${response.status}): ${text}`);
        return;
      }
      
      setResult(text);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    }
  };
  
  const testDeleteCourse = async () => {
    if (!courseId) {
      setError('Please enter or select a course ID');
      return;
    }
    
    setResult(null);
    setError(null);
    
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        setError('Not authenticated');
        return;
      }
      
      const response = await fetch(`/api/test-delete/${courseId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      const text = await response.text();
      
      if (!response.ok) {
        setError(`Error (${response.status}): ${text}`);
        return;
      }
      
      setResult(text);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    }
  };
  
  return (
    <>
      <Navbar />
      <main className="container mx-auto px-4 py-8">
        <div className="mb-6 flex items-center justify-between">
          <h1 className="text-2xl font-bold">Course Deletion Debug</h1>
          <button
            onClick={() => router.push('/admin')}
            className="btn btn-secondary"
          >
            Back to Admin Panel
          </button>
        </div>
        
        <div className="bg-background-light p-6 rounded-lg shadow-md mb-6">
          <h2 className="text-xl font-semibold mb-4">Test MongoDB Operations</h2>
          
          <div className="mb-4">
            <label className="block text-sm font-medium mb-2">
              Select a course to test:
            </label>
            
            <select
              value={courseId}
              onChange={(e) => setCourseId(e.target.value)}
              className="input w-full mb-4"
            >
              <option value="">Select a course</option>
              {courses.map((course) => (
                <option key={course._id} value={course._id}>
                  {course.title} ({course._id})
                </option>
              ))}
            </select>
            
            <div className="mb-2">
              <label className="block text-sm font-medium mb-1">
                Or enter course ID manually:
              </label>
              <input
                type="text"
                value={courseId}
                onChange={(e) => setCourseId(e.target.value)}
                className="input w-full"
                placeholder="Enter course ID"
              />
            </div>
          </div>
          
          <div className="flex space-x-4 mb-6">
            <button
              onClick={testFindCourse}
              className="btn btn-primary flex-1"
            >
              Test Find Course
            </button>
            
            <button
              onClick={testDeleteCourse}
              className="btn btn-secondary flex-1"
            >
              Test Delete Course
            </button>
          </div>
          
          <p className="text-sm text-text-secondary mb-2">
            Note: The test delete function doesn't actually delete anything.
            It just tests the database operation to diagnose issues.
          </p>
        </div>
        
        {error && (
          <div className="bg-red-900/30 text-red-200 p-4 rounded-lg mb-6">
            <h3 className="font-semibold mb-2">Error</h3>
            <pre className="whitespace-pre-wrap text-sm">{error}</pre>
          </div>
        )}
        
        {result && (
          <div className="bg-green-900/30 text-green-200 p-4 rounded-lg">
            <h3 className="font-semibold mb-2">Result</h3>
            <pre className="whitespace-pre-wrap text-sm">{result}</pre>
          </div>
        )}
      </main>
    </>
  );
} 