import { Fragment } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import PropTypes from 'prop-types';
import Button from './Button';

const Modal = ({
  isOpen = false,
  onClose,
  title,
  children,
  actions,
  size = 'md',
  showClose = true,
}) => {
  const sizes = {
    sm: 'max-w-md',
    md: 'max-w-lg',
    lg: 'max-w-2xl',
    xl: 'max-w-4xl',
  };

  return (
    <Transition.Root show={isOpen} as={Fragment}>
      <Dialog as="div" className="relative z-50" onClose={onClose}>
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-200"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" />
        </Transition.Child>

        <div className="fixed inset-0 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4 text-center">
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-300"
              enterFrom="opacity-0 scale-95"
              enterTo="opacity-100 scale-100"
              leave="ease-in duration-200"
              leaveFrom="opacity-100 scale-100"
              leaveTo="opacity-0 scale-95"
            >
              <Dialog.Panel className={`w-full ${sizes[size]} transform overflow-hidden rounded-2xl bg-white dark:bg-gray-800 p-6 text-left align-middle shadow-xl transition-all`}>
                <div className="flex justify-between items-start">
                  <Dialog.Title
                    as="h3"
                    className="text-lg font-semibold text-gray-900 dark:text-gray-100"
                  >
                    {title}
                  </Dialog.Title>
                  {showClose && (
                    <button
                      onClick={onClose}
                      className="p-1 rounded-full text-gray-400 hover:text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                    >
                      <span className="sr-only">Close</span>
                      <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  )}
                </div>

                <div className="mt-4">
                  {children}
                </div>

                {actions && (
                  <div className="mt-6 flex justify-end space-x-3">
                    {actions}
                  </div>
                )}
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition.Root>
  );
};

Modal.propTypes = {
  isOpen: PropTypes.bool,
  onClose: PropTypes.func.isRequired,
  title: PropTypes.string,
  children: PropTypes.node,
  actions: PropTypes.node,
  size: PropTypes.oneOf(['sm', 'md', 'lg', 'xl']),
  showClose: PropTypes.bool,
};

export default Modal;