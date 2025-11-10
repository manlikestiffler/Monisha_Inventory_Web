import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, User, Phone, School, Ruler } from 'lucide-react';
// import { db } from '../../config/firebase'; // Assuming you have this configured
// import { collection, getDocs } from 'firebase/firestore';

const AddStudentModal = ({ isOpen, onClose, schoolId, uniformRequirements = [] }) => {
  const [step, setStep] = useState(1); // Step 1: Student Info, Step 2: Uniform Selection
  const [formData, setFormData] = useState({
    fullName: '',
    level: 'JUNIOR',
    sex: 'Male',
    guardianPhone: '',
    uniforms: [] // Will store selected uniforms
  });

  // Reset form when modal closes
  useEffect(() => {
    if (!isOpen) {
      setFormData({
        fullName: '',
        level: 'JUNIOR',
        sex: 'Male',
        guardianPhone: '',
        uniforms: []
      });
      setStep(1);
    }
  }, [isOpen]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleUniformToggle = (uniformId) => {
    setFormData(prev => ({
      ...prev,
      uniforms: prev.uniforms.includes(uniformId)
        ? prev.uniforms.filter(id => id !== uniformId)
        : [...prev.uniforms, uniformId]
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (step === 1) {
      setStep(2); // Move to uniform selection
      return;
    }
    // Final submission
    console.log('Submitting student data:', formData);
    // Add logic to save to Firebase here
    onClose();
  };

  const modalVariants = {
    hidden: { opacity: 0, scale: 0.95 },
    visible: { opacity: 1, scale: 1, transition: { type: 'spring', stiffness: 300, damping: 30 } },
    exit: { opacity: 0, scale: 0.95, transition: { duration: 0.2 } }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
        <motion.div
          initial="hidden"
          animate="visible"
          exit="exit"
          variants={modalVariants}
          className="bg-card w-full max-w-2xl rounded-xl shadow-xl border border-default overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          <form onSubmit={handleSubmit}>
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-default">
              <h2 className="text-2xl font-semibold">
                {step === 1 ? 'Add New Student' : 'Select Required Uniforms'}
              </h2>
              <button
                type="button"
                onClick={onClose}
                className="p-2 rounded-full hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            {/* Form Content */}
            <div className="p-6 max-h-[calc(100vh-200px)] overflow-y-auto">
              {step === 1 ? (
                /* Step 1: Student Information */
                <div className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium flex items-center gap-2">
                      <User size={16} />
                      Full Name
                    </label>
                    <input
                      type="text"
                      name="fullName"
                      value={formData.fullName}
                      onChange={handleChange}
                      className="w-full p-2 rounded-lg bg-secondary/50 border border-default focus:outline-none focus:ring-2 focus:ring-primary"
                      required
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-sm font-medium flex items-center gap-2">
                        <School size={16} />
                        Level
                      </label>
                      <select
                        name="level"
                        value={formData.level}
                        onChange={handleChange}
                        className="w-full p-2 rounded-lg bg-secondary/50 border border-default focus:outline-none focus:ring-2 focus:ring-primary"
                      >
                        <option value="JUNIOR">Junior</option>
                        <option value="SENIOR">Senior</option>
                      </select>
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-medium flex items-center gap-2">
                        <User size={16} />
                        Sex
                      </label>
                      <select
                        name="sex"
                        value={formData.sex}
                        onChange={handleChange}
                        className="w-full p-2 rounded-lg bg-secondary/50 border border-default focus:outline-none focus:ring-2 focus:ring-primary"
                      >
                        <option value="Male">Male</option>
                        <option value="Female">Female</option>
                      </select>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium flex items-center gap-2">
                      <Phone size={16} />
                      Guardian Phone
                    </label>
                    <input
                      type="tel"
                      name="guardianPhone"
                      value={formData.guardianPhone}
                      onChange={handleChange}
                      className="w-full p-2 rounded-lg bg-secondary/50 border border-default focus:outline-none focus:ring-2 focus:ring-primary"
                      required
                    />
                  </div>
                </div>
              ) : (
                /* Step 2: Uniform Selection */
                <div className="space-y-4">
                  <p className="text-sm text-muted-foreground">
                    Select the required uniforms for this student based on their level and sex:
                  </p>
                  
                  <div className="space-y-3">
                    {uniformRequirements
                      .filter(uniform => 
                        uniform.level === formData.level && 
                        (uniform.sex === formData.sex || uniform.sex === 'Any')
                      )
                      .map(uniform => (
                        <div
                          key={uniform.id}
                          className="flex items-center gap-3 p-3 rounded-lg border border-default hover:bg-secondary/50 transition-colors"
                        >
                          <input
                            type="checkbox"
                            id={uniform.id}
                            checked={formData.uniforms.includes(uniform.id)}
                            onChange={() => handleUniformToggle(uniform.id)}
                            className="h-4 w-4 rounded border-primary text-primary focus:ring-primary"
                          />
                          <label htmlFor={uniform.id} className="flex-1 flex items-center gap-2">
                            <Ruler size={16} className="text-muted-foreground" />
                            <div>
                              <p className="font-medium">{uniform.name}</p>
                              <p className="text-sm text-muted-foreground">
                                Size: {uniform.size} | Color: {uniform.color}
                              </p>
                            </div>
                          </label>
                        </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="flex items-center justify-end gap-3 p-6 border-t border-default bg-secondary/30">
              <button
                type="button"
                onClick={step === 1 ? onClose : () => setStep(1)}
                className="px-4 py-2 rounded-lg border border-destructive/50 text-destructive hover:bg-destructive/10"
              >
                {step === 1 ? 'Cancel' : 'Back'}
              </button>
              <button
                type="submit"
                className="px-4 py-2 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90"
              >
                {step === 1 ? 'Next: Select Uniforms' : 'Add Student'}
              </button>
            </div>
          </form>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

const InputWrapper = ({ label, icon: Icon, children }) => (
  <div className="flex flex-col gap-2">
    <label className="text-sm font-medium text-muted-foreground flex items-center gap-2">
      {Icon && <Icon size={16} />}
      {label}
    </label>
    {children}
  </div>
);

export default AddStudentModal; 