'use client';

import React, { useState, useRef } from 'react';
import { X, Upload, Image as ImageIcon, Check, AlertCircle } from 'lucide-react';
import { tenantPortalService, ProductVariant } from '@/services/tenantPortalService';

interface ImageUploadPopupProps {
  isOpen: boolean;
  onClose: () => void;
  variants: ProductVariant[];
  onSuccess: (message: string) => void;
  onError: (message: string) => void;
}

interface VariantImageState {
  variantId: string;
  file: File | null;
  preview: string;
  uploading: boolean;
  uploaded: boolean;
  error: string;
}

export default function ImageUploadPopup({ isOpen, onClose, variants, onSuccess, onError }: ImageUploadPopupProps) {
  const [variantImages, setVariantImages] = useState<VariantImageState[]>(
    variants.map(variant => ({
      variantId: variant.id,
      file: null,
      preview: '',
      uploading: false,
      uploaded: false,
      error: ''
    }))
  );
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRefs = useRef<{ [key: string]: HTMLInputElement | null }>({});

  const handleImageSelect = (variantId: string, file: File) => {
    // Validate file type
    if (!file.type.startsWith('image/')) {
      setVariantImages(prev => prev.map(vi => 
        vi.variantId === variantId 
          ? { ...vi, error: 'Please select a valid image file' }
          : vi
      ));
      return;
    }
    
    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      setVariantImages(prev => prev.map(vi => 
        vi.variantId === variantId 
          ? { ...vi, error: 'Image size should be less than 5MB' }
          : vi
      ));
      return;
    }

    // Create preview
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        // Create canvas for resizing to 1:1 aspect ratio
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        
        const size = Math.min(img.width, img.height);
        canvas.width = 400;
        canvas.height = 400;
        
        // Calculate crop position for center crop
        const cropX = (img.width - size) / 2;
        const cropY = (img.height - size) / 2;
        
        ctx?.drawImage(img, cropX, cropY, size, size, 0, 0, 400, 400);
        
        const resizedDataUrl = canvas.toDataURL('image/jpeg', 0.8);
        
        setVariantImages(prev => prev.map(vi => 
          vi.variantId === variantId 
            ? { ...vi, file, preview: resizedDataUrl, error: '' }
            : vi
        ));
      };
      img.src = e.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  const removeImage = (variantId: string) => {
    setVariantImages(prev => prev.map(vi => 
      vi.variantId === variantId 
        ? { ...vi, file: null, preview: '', error: '', uploaded: false }
        : vi
    ));
    
    if (fileInputRefs.current[variantId]) {
      fileInputRefs.current[variantId]!.value = '';
    }
  };

  const uploadSingleImage = async (variantId: string, file: File) => {
    try {
      console.log('=== STARTING IMAGE UPLOAD ===');
      console.log('Variant ID:', variantId);
      console.log('File:', file.name, file.type, file.size);
      
      setVariantImages(prev => prev.map(vi => 
        vi.variantId === variantId 
          ? { ...vi, uploading: true, error: '' }
          : vi
      ));

      // Step 1: Generate upload URL
      console.log('Step 1: Generating upload URL...');
      const fileExt = file.name.split('.').pop() || 'jpg';
      const uploadUrlResponse = await tenantPortalService.generateImageUploadUrl(
        variantId, 
        file.type, 
        fileExt
      );
      console.log('Upload URL response:', uploadUrlResponse);

      // Step 2: Upload to S3
      console.log('Step 2: Uploading to S3...');
      const uploadResponse = await tenantPortalService.uploadImageToS3(
        uploadUrlResponse.uploadUrl, 
        file
      );
      console.log('S3 upload response status:', uploadResponse.status);

      if (!uploadResponse.ok) {
        console.error('S3 upload failed:', uploadResponse.status, uploadResponse.statusText);
        throw new Error('Failed to upload image to S3');
      }

      // Step 3: Commit image key to database
      console.log('Step 3: Committing image key to database...');
      const commitResponse = await tenantPortalService.commitImageKey(variantId, uploadUrlResponse.key);
      console.log('Commit response:', commitResponse);

      setVariantImages(prev => prev.map(vi => 
        vi.variantId === variantId 
          ? { ...vi, uploading: false, uploaded: true }
          : vi
      ));

      return true;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Upload failed';
      setVariantImages(prev => prev.map(vi => 
        vi.variantId === variantId 
          ? { ...vi, uploading: false, error: errorMessage }
          : vi
      ));
      return false;
    }
  };

  const handleUploadAll = async () => {
    const imagesToUpload = variantImages.filter(vi => vi.file && !vi.uploaded);
    
    if (imagesToUpload.length === 0) {
      onError('Please select at least one image to upload');
      return;
    }

    setIsUploading(true);
    let successCount = 0;
    let failCount = 0;

    for (const variantImage of imagesToUpload) {
      if (variantImage.file) {
        const success = await uploadSingleImage(variantImage.variantId, variantImage.file);
        if (success) {
          successCount++;
        } else {
          failCount++;
        }
      }
    }

    setIsUploading(false);

    if (successCount > 0 && failCount === 0) {
      onSuccess(`Successfully uploaded ${successCount} image(s)`);
      setTimeout(() => {
        onClose();
      }, 2000);
    } else if (successCount > 0 && failCount > 0) {
      onError(`Uploaded ${successCount} image(s), ${failCount} failed`);
    } else {
      onError('All uploads failed. Please try again.');
    }
  };

  const handleSkip = () => {
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-2xl font-bold text-gray-900">Upload Variant Images</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="p-6">
          <p className="text-gray-600 mb-6">
            Upload images for your product variants. You can skip this step and add images later.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {variants.map((variant) => {
              const variantImage = variantImages.find(vi => vi.variantId === variant.id);
              if (!variantImage) return null;

              return (
                <div key={variant.id} className="border rounded-lg p-4">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="font-semibold text-gray-900">
                      {variant.color} - {variant.size}
                    </h3>
                    {variantImage.uploaded && (
                      <div className="flex items-center text-green-600">
                        <Check className="w-4 h-4 mr-1" />
                        <span className="text-sm">Uploaded</span>
                      </div>
                    )}
                  </div>

                  {variantImage.preview ? (
                    <div className="relative">
                      <img
                        src={variantImage.preview}
                        alt={`${variant.color} ${variant.size}`}
                        className="w-full h-48 object-cover rounded-lg"
                      />
                      <button
                        onClick={() => removeImage(variant.id)}
                        className="absolute top-2 right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600"
                        disabled={variantImage.uploading}
                      >
                        <X className="w-4 h-4" />
                      </button>
                      {variantImage.uploading && (
                        <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center rounded-lg">
                          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-gray-400 transition-colors">
                      <input
                        ref={(el) => {
                          fileInputRefs.current[variant.id] = el;
                        }}
                        type="file"
                        accept="image/*"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            handleImageSelect(variant.id, file);
                          }
                        }}
                        className="hidden"
                        id={`image-${variant.id}`}
                      />
                      <label
                        htmlFor={`image-${variant.id}`}
                        className="cursor-pointer flex flex-col items-center"
                      >
                        <ImageIcon className="w-12 h-12 text-gray-400 mb-2" />
                        <span className="text-gray-600">Click to upload image</span>
                        <span className="text-sm text-gray-400 mt-1">PNG, JPG up to 5MB</span>
                      </label>
                    </div>
                  )}

                  {variantImage.error && (
                    <div className="mt-2 flex items-center text-red-600">
                      <AlertCircle className="w-4 h-4 mr-1" />
                      <span className="text-sm">{variantImage.error}</span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          <div className="flex justify-end space-x-4 mt-8">
            <button
              onClick={handleSkip}
              className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
              disabled={isUploading}
            >
              Skip for Now
            </button>
            <button
              onClick={handleUploadAll}
              disabled={isUploading || variantImages.every(vi => !vi.file || vi.uploaded)}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
            >
              {isUploading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Uploading...
                </>
              ) : (
                <>
                  <Upload className="w-4 h-4 mr-2" />
                  Upload Images
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}