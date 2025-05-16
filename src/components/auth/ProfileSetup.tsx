import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { supabase } from '../../lib/supabaseClient';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';
import { Camera, Loader } from 'lucide-react';
import { z } from 'zod';

const profileSchema = z.object({
  name: z.string().min(3).max(50),
  bio: z.string().max(160).optional(),
  gender: z.enum(['male', 'female', 'other']),
  age: z.number().min(18).max(100),
  country: z.string().length(2)
});

interface ProfileSetupProps {
  mode?: 'create' | 'edit';
  onClose?: () => void;
}

const ProfileSetup: React.FC<ProfileSetupProps> = ({ mode = 'create', onClose }) => {
  const { user, updateProfile } = useAuth();
  const { showSuccess, showError } = useToast();
  
  const [formData, setFormData] = useState({
    name: user?.name || '',
    bio: user?.bio || '',
    gender: user?.gender || '',
    age: user?.age?.toString() || '',
    country: user?.country || ''
  });
  
  const [profileImage, setProfileImage] = useState<File | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  
  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && file.type.startsWith('image/')) {
      setProfileImage(file);
    }
  };
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    
    try {
      const validatedData = profileSchema.parse({
        ...formData,
        age: parseInt(formData.age)
      });
      
      let profilePictureUrl = user?.profile_picture;
      if (profileImage && user) {
        const fileName = `${user.id}/profile.${profileImage.name.split('.').pop()}`;
        const { error: uploadError } = await supabase.storage
          .from('profilepictures')
          .upload(fileName, profileImage, {
            upsert: true
          });
          
        if (uploadError) throw uploadError;
        
        const { data: { publicUrl } } = supabase.storage
          .from('profilepictures')
          .getPublicUrl(fileName);
          
        profilePictureUrl = publicUrl;
      }
      
      const { error: updateError } = await supabase
        .from('users')
        .update({
          username: validatedData.name,
          bio: validatedData.bio,
          gender: validatedData.gender,
          age: validatedData.age,
          country: validatedData.country,
          profile_picture: profilePictureUrl
        })
        .eq('id', user?.id);

      if (updateError) throw updateError;
      
      await updateProfile({
        ...validatedData,
        profile_picture: profilePictureUrl
      });
      
      showSuccess(mode === 'create' ? 'Profile created successfully!' : 'Profile updated successfully!');
      onClose?.();
    } catch (error) {
      console.error('Profile update error:', error);
      showError(error instanceof Error ? error.message : 'Failed to update profile');
    } finally {
      setIsLoading(false);
    }
  };
  
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-dark-300 rounded-xl w-full max-w-md p-6"
      >
        <h2 className="text-2xl font-bold text-white mb-6">
          {mode === 'create' ? 'Complete Your Profile' : 'Edit Profile'}
        </h2>
        
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="flex justify-center">
            <div className="relative">
              <div className="w-24 h-24 rounded-full bg-dark-200 flex items-center justify-center overflow-hidden">
                {profileImage ? (
                  <img
                    src={URL.createObjectURL(profileImage)}
                    alt="Profile preview"
                    className="w-full h-full object-cover"
                  />
                ) : user?.profile_picture ? (
                  <img
                    src={user.profile_picture}
                    alt="Current profile"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <Camera size={32} className="text-gray-400" />
                )}
              </div>
              <input
                type="file"
                accept="image/*"
                onChange={handleImageChange}
                className="hidden"
                id="profile-image"
              />
              <label
                htmlFor="profile-image"
                className="absolute bottom-0 right-0 p-1.5 bg-primary-500 rounded-full cursor-pointer hover:bg-primary-600 transition-colors"
              >
                <Camera size={16} className="text-dark-300" />
              </label>
            </div>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">
              Name
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-4 py-2 bg-dark-200 border border-dark-100 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
              required
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">
              Bio
            </label>
            <textarea
              value={formData.bio}
              onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
              className="w-full px-4 py-2 bg-dark-200 border border-dark-100 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
              rows={3}
              maxLength={160}
            />
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">
                Gender
              </label>
              <select
                value={formData.gender}
                onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
                className="w-full px-4 py-2 bg-dark-200 border border-dark-100 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
                required
              >
                <option value="">Select gender</option>
                <option value="male">Male</option>
                <option value="female">Female</option>
                <option value="other">Other</option>
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">
                Age
              </label>
              <input
                type="number"
                value={formData.age}
                onChange={(e) => setFormData({ ...formData, age: e.target.value })}
                min="18"
                max="100"
                className="w-full px-4 py-2 bg-dark-200 border border-dark-100 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
                required
              />
            </div>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">
              Country
            </label>
            <select
              value={formData.country}
              onChange={(e) => setFormData({ ...formData, country: e.target.value })}
              className="w-full px-4 py-2 bg-dark-200 border border-dark-100 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
              required
            >
              <option value="">Select country</option>
              <option value="US">United States</option>
              <option value="GB">United Kingdom</option>
              <option value="CA">Canada</option>
              <option value="AU">Australia</option>
              <option value="DE">Germany</option>
              <option value="FR">France</option>
              <option value="JP">Japan</option>
              <option value="BR">Brazil</option>
              <option value="IN">India</option>
            </select>
          </div>
          
          <div className="flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-3 bg-dark-200 text-white rounded-lg font-medium hover:bg-dark-100 transition-colors"
            >
              Return to Home
            </button>
            
            <button
              type="submit"
              disabled={isLoading}
              className="flex-1 py-3 bg-primary-500 text-dark-300 rounded-lg font-medium hover:bg-primary-600 transition-colors flex items-center justify-center gap-2"
            >
              {isLoading ? (
                <>
                  <Loader size={16} className="animate-spin" />
                  <span>Saving...</span>
                </>
              ) : mode === 'create' ? (
                'Complete Profile'
              ) : (
                'Save Changes'
              )}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
};

export default ProfileSetup;