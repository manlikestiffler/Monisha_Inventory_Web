import { useState } from 'react';
import { Tab } from '@headlessui/react';
import { FiUsers, FiShoppingBag, FiPlus, FiAlertTriangle } from 'react-icons/fi';

function classNames(...classes) {
  return classes.filter(Boolean).join(' ');
}

const SchoolTabUI = ({ 
  school, 
  onAddStudent,
  uniformsTabContent,
  studentsTabContent,
  deficitReportTabContent,
}) => {
  const [selectedTab, setSelectedTab] = useState(0);

  return (
    <div className="bg-transparent">
      <Tab.Group onChange={setSelectedTab} selectedIndex={selectedTab}>
        <div className="flex flex-col md:flex-row md:items-center md:justify-between px-2 pb-6">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-6 md:mb-0 flex items-center">
            <span className="w-10 h-10 rounded-xl bg-gradient-to-br from-red-500/20 to-red-600/20 dark:from-red-500/10 dark:to-red-600/10 flex items-center justify-center mr-3">
              {selectedTab === 0 ? (
                <FiShoppingBag className="w-5 h-5 text-red-600 dark:text-red-400" />
              ) : selectedTab === 1 ? (
                <FiUsers className="w-5 h-5 text-red-600 dark:text-red-400" />
              ) : (
                <FiAlertTriangle className="w-5 h-5 text-red-600 dark:text-red-400" />
              )}
            </span>
            {school?.name} Management
          </h2>
          
          <div className="flex items-center space-x-4">
            <Tab.List className="flex rounded-xl bg-gray-100/50 dark:bg-gray-800/50 backdrop-blur-sm p-1">
              <Tab
                className={({ selected }) =>
                  classNames(
                    'flex items-center px-4 py-2.5 text-sm font-medium rounded-lg transition-all duration-200',
                    'focus:outline-none',
                    selected
                      ? 'bg-red-600 text-white shadow-lg shadow-red-600/20'
                      : 'text-gray-600 dark:text-gray-300 hover:text-red-600 dark:hover:text-red-400 hover:bg-white dark:hover:bg-gray-700/50'
                  )
                }
              >
                <FiShoppingBag className="w-4 h-4 mr-2" />
                Uniforms
              </Tab>
              <Tab
                className={({ selected }) =>
                  classNames(
                    'flex items-center px-4 py-2.5 text-sm font-medium rounded-lg transition-all duration-200',
                    'focus:outline-none',
                    selected
                      ? 'bg-red-600 text-white shadow-lg shadow-red-600/20'
                      : 'text-gray-600 dark:text-gray-300 hover:text-red-600 dark:hover:text-red-400 hover:bg-white dark:hover:bg-gray-700/50'
                  )
                }
              >
                <FiUsers className="w-4 h-4 mr-2" />
                Students
              </Tab>
              <Tab
                className={({ selected }) =>
                  classNames(
                    'flex items-center px-4 py-2.5 text-sm font-medium rounded-lg transition-all duration-200',
                    'focus:outline-none',
                    selected
                      ? 'bg-red-600 text-white shadow-lg shadow-red-600/20'
                      : 'text-gray-600 dark:text-gray-300 hover:text-red-600 dark:hover:text-red-400 hover:bg-white dark:hover:bg-gray-700/50'
                  )
                }
              >
                <FiAlertTriangle className="w-4 h-4 mr-2" />
                Deficit Report
              </Tab>
            </Tab.List>

            {selectedTab === 1 && (
               <button
                onClick={onAddStudent}
                className="inline-flex items-center px-4 py-2.5 text-sm font-medium rounded-lg text-white bg-gradient-to-r from-red-600 to-red-500 hover:from-red-500 hover:to-red-600 transition-all duration-200 shadow-lg shadow-red-600/20 hover:shadow-red-600/30 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 dark:focus:ring-offset-gray-900"
              >
                <FiPlus className="w-4 h-4 mr-2" />
                Add Student
              </button>
            )}
          </div>
        </div>
          
        <Tab.Panels className="mt-4">
          <Tab.Panel>
            {uniformsTabContent}
          </Tab.Panel>
          <Tab.Panel>
            {studentsTabContent}
          </Tab.Panel>
          <Tab.Panel>
            {deficitReportTabContent}
          </Tab.Panel>
        </Tab.Panels>
      </Tab.Group>
    </div>
  );
};

export default SchoolTabUI; 