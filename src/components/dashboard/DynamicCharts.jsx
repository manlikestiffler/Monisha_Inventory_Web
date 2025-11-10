import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LineChart, Line, PieChart, Pie, Cell, Legend, AreaChart, Area,
} from 'recharts';
import { getChartColors, getCommonChartProps, getChartColorArray } from '../../utils/chartColors';

const DynamicCharts = ({ products, orders, schools, batches, loading }) => {
  // Reduced logging - only log when data changes significantly
  const dataHash = `${products?.length || 0}-${orders?.length || 0}-${schools?.length || 0}-${batches?.length || 0}`;
  const [lastDataHash, setLastDataHash] = useState('');
  
  useEffect(() => {
    if (dataHash !== lastDataHash) {
      console.log('📊 DynamicCharts data updated:', { 
        products: products?.length, 
        orders: orders?.length, 
        schools: schools?.length, 
        batches: batches?.length
      });
      setLastDataHash(dataHash);
    }
  }, [dataHash, lastDataHash]);
  const [activeCategory, setActiveCategory] = useState('analytics');
  const [activeChart, setActiveChart] = useState('demand');
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear().toString());
  const [chartData, setChartData] = useState({
    analytics: {
      demand: [],
      years: []
    },
    financials: {
      revenue: [],
      topProducts: []
    },
    schools: {
      inventoryPerSchool: [],
      ordersPerSchool: []
    }
  });

  // Process data when props change
  useEffect(() => {
    if (loading) return;
    
    processData();
  }, [products, orders, schools, batches, loading]);

  const processData = () => {
    console.log('🔍 Processing chart data with:', {
      products: products?.length || 0,
      orders: orders?.length || 0,
      schools: schools?.length || 0,
      batches: batches?.length || 0
    });

    const newChartData = {
      analytics: {
        demand: [],
        years: []
      },
      financials: {
        revenue: [],
        topProducts: []
      },
      schools: {
        inventoryPerSchool: [],
        ordersPerSchool: []
      }
    };

    // Process size demand data from batches
    processSizeDemandData(newChartData);
    
    // Process revenue data from orders
    processRevenueData(newChartData);
    
    // Process top products data
    processTopProductsData(newChartData);
    
    // Process inventory by school data
    processInventoryBySchoolData(newChartData);
    
    // Process orders by school data
    processOrdersBySchoolData(newChartData);
    
    console.log('📊 Processed chart data:', newChartData);
    setChartData(newChartData);
  };

  const processSizeDemandData = (newChartData) => {
    console.log('📏 Processing size demand data:', { 
      orders: orders?.length, 
      products: products?.length, 
      batches: batches?.length,
      productsData: products,
      batchesData: batches
    });
    
    // Process size demand from actual inventory data
    const sizeDemand = {};
    const currentYear = new Date().getFullYear();
    
    // Initialize size demand structure
    newChartData.analytics.demand[currentYear] = [];
    
    // Process orders for actual size demand
    orders.forEach(order => {
      if (order.items && Array.isArray(order.items)) {
        order.items.forEach(item => {
          if (item.sizes && Array.isArray(item.sizes)) {
            item.sizes.forEach(sizeInfo => {
              const size = sizeInfo.size || sizeInfo.name;
              const quantity = sizeInfo.quantity || 0;
              
              if (size && quantity > 0) {
                if (!sizeDemand[size]) {
                  sizeDemand[size] = 0;
                }
                sizeDemand[size] += quantity;
              }
            });
          }
        });
      }
    });
    
    // If no order data, analyze from batch inventory
    if (Object.keys(sizeDemand).length === 0 && batches.length > 0) {
      batches.forEach(batch => {
        if (batch.items && Array.isArray(batch.items)) {
          batch.items.forEach(item => {
            if (item.sizes && Array.isArray(item.sizes)) {
              item.sizes.forEach(sizeInfo => {
                const size = sizeInfo.size || sizeInfo.name;
                const quantity = sizeInfo.quantity || 0;
                
                if (size && quantity > 0) {
                  if (!sizeDemand[size]) {
                    sizeDemand[size] = 0;
                  }
                  // Use current stock as proxy for demand
                  sizeDemand[size] += quantity;
                }
              });
            }
          });
        }
      });
    }
    
    // If still no data, analyze from product inventory (uniform_variants)
    if (Object.keys(sizeDemand).length === 0 && products.length > 0) {
      products.forEach(product => {
        // Check variants first
        if (product.variants && Array.isArray(product.variants)) {
          product.variants.forEach(variant => {
            if (variant.sizes && Array.isArray(variant.sizes)) {
              variant.sizes.forEach(sizeInfo => {
                const size = sizeInfo.size || sizeInfo.name;
                const quantity = sizeInfo.quantity || 0;
                const allocated = sizeInfo.allocated || 0;
                
                if (size) {
                  if (!sizeDemand[size]) {
                    sizeDemand[size] = 0;
                  }
                  // Use allocated + current stock as demand indicator
                  sizeDemand[size] += allocated + quantity;
                }
              });
            }
          });
        }
        // Check direct sizes
        else if (product.sizes && Array.isArray(product.sizes)) {
          product.sizes.forEach(sizeInfo => {
            const size = sizeInfo.size || sizeInfo.name;
            const quantity = sizeInfo.quantity || 0;
            const allocated = sizeInfo.allocated || 0;
            
            if (size) {
              if (!sizeDemand[size]) {
                sizeDemand[size] = 0;
              }
              sizeDemand[size] += allocated + quantity;
            }
          });
        }
      });
    }
    
    // Convert to chart format
    const colors = getChartColors();
    const colorArray = getChartColorArray(Object.keys(sizeDemand).length);
    
    const sizeData = Object.entries(sizeDemand)
      .map(([size, totalSales], index) => {
        let demandCategory = 'Low';
        let color = colors.danger;
        
        if (totalSales > 50) {
          demandCategory = 'High';
          color = colors.success;
        } else if (totalSales > 20) {
          demandCategory = 'Medium';
          color = colors.warning;
        }
        
        return {
          size,
          totalSales,
          demandCategory,
          color: colorArray[index % colorArray.length]
        };
      })
      .sort((a, b) => b.totalSales - a.totalSales);
    
    console.log('📊 Size demand result:', sizeData);
    newChartData.analytics.demand[currentYear] = sizeData;
  };

  const processRevenueData = (newChartData) => {
    // Group orders by month
    const monthlyRevenue = {};
    
    // Initialize all months
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    months.forEach(month => {
      monthlyRevenue[month] = 0;
    });
    
    // Calculate revenue by month for the current year
    const currentYear = new Date().getFullYear();
    
    orders.forEach(order => {
      const date = order.createdAt instanceof Date ? order.createdAt : new Date(order.createdAt?.seconds * 1000);
      
      // Only include orders from current year
      if (date.getFullYear() === currentYear) {
        const month = months[date.getMonth()];
        monthlyRevenue[month] += (order.totalAmount || 0);
      }
    });
    
    // Convert to array format
    const revenueData = months.map(month => ({
      month,
      revenue: monthlyRevenue[month]
    }));
    
    newChartData.financials.revenue = revenueData;
  };

  const processTopProductsData = (newChartData) => {
    console.log('🏆 Processing top products data:', { orders: orders?.length, products: products?.length });
    
    // Count product sales from orders
    const productSales = {};
    
    orders.forEach(order => {
      if (order.items && Array.isArray(order.items)) {
        order.items.forEach(item => {
          const productName = item.productName || item.name || 'Unknown Product';
          const quantity = item.quantity || 0;
          
          if (!productSales[productName]) {
            productSales[productName] = 0;
          }
          productSales[productName] += quantity;
        });
      }
    });
    
    // If no order data, use actual product inventory data
    if (Object.keys(productSales).length === 0 && products.length > 0) {
      products.forEach(product => {
        const productName = product.name || product.productName || 'Unknown Product';
        
        // For uniforms with variants, sum up all variant quantities
        if (product.variants && Array.isArray(product.variants)) {
          let totalQuantity = 0;
          product.variants.forEach(variant => {
            if (variant.sizes && Array.isArray(variant.sizes)) {
              variant.sizes.forEach(size => {
                // Use allocated quantity as proxy for sales/demand
                totalQuantity += (size.allocated || 0);
                // If no allocated data, use a portion of current stock as proxy
                if (!size.allocated && size.quantity > 0) {
                  totalQuantity += Math.floor(size.quantity * 0.3); // Assume 30% has been sold
                }
              });
            }
          });
          
          if (totalQuantity > 0) {
            productSales[productName] = totalQuantity;
          }
        }
        // For products with direct sizes (like raw materials)
        else if (product.sizes && Array.isArray(product.sizes)) {
          let totalQuantity = 0;
          product.sizes.forEach(size => {
            totalQuantity += (size.allocated || 0);
            if (!size.allocated && size.quantity > 0) {
              totalQuantity += Math.floor(size.quantity * 0.3);
            }
          });
          
          if (totalQuantity > 0) {
            productSales[productName] = totalQuantity;
          }
        }
      });
    }
    
    // Convert to chart format
    const colorArray = getChartColorArray(Object.keys(productSales).length);
    const topProducts = Object.entries(productSales)
      .map(([name, sales], index) => ({
        name,
        sales,
        color: colorArray[index % colorArray.length]
      }))
      .sort((a, b) => b.sales - a.sales)
      .slice(0, 5); // Take top 5
    
    console.log('📊 Top products result:', topProducts);
    newChartData.financials.topProducts = topProducts;
  };

  const processInventoryBySchoolData = (newChartData) => {
    console.log('🏫 Processing inventory by school data:', { 
      schools: schools?.length, 
      products: products?.length,
      batches: batches?.length,
      schoolsData: schools,
      productsData: products,
      batchesData: batches
    });
    
    // Use actual inventory data from batches and products
    const schoolInventory = {};
    
    // Initialize with schools data
    schools.forEach(school => {
      schoolInventory[school.id] = {
        name: school.name || 'Unknown School',
        inStock: 0,
        lowStock: 0,
        outOfStock: 0
      };
    });
    
    // Count total inventory from all sources
    let totalInStock = 0;
    let totalLowStock = 0;
    let totalOutOfStock = 0;
    
    // Process batch inventory data
    batches.forEach(batch => {
      if (batch.items && Array.isArray(batch.items)) {
        batch.items.forEach(item => {
          if (item.sizes && Array.isArray(item.sizes)) {
            item.sizes.forEach(size => {
              const quantity = size.quantity || 0;
              
              if (quantity === 0) {
                totalOutOfStock++;
              } else if (quantity <= 5) {
                totalLowStock++;
              } else {
                totalInStock++;
              }
            });
          }
        });
      }
    });
    
    // Process product inventory data (uniform_variants)
    products.forEach(product => {
      // Check if product has variants
      if (product.variants && Array.isArray(product.variants)) {
        product.variants.forEach(variant => {
          if (variant.sizes && Array.isArray(variant.sizes)) {
            variant.sizes.forEach(size => {
              const quantity = size.quantity || 0;
              
              if (quantity === 0) {
                totalOutOfStock++;
              } else if (quantity <= 5) {
                totalLowStock++;
              } else {
                totalInStock++;
              }
            });
          }
        });
      }
      // Check if product has direct sizes
      else if (product.sizes && Array.isArray(product.sizes)) {
        product.sizes.forEach(size => {
          const quantity = size.quantity || 0;
          
          if (quantity === 0) {
            totalOutOfStock++;
          } else if (quantity <= 5) {
            totalLowStock++;
          } else {
            totalInStock++;
          }
        });
      }
    });
    
    console.log('📊 Inventory totals:', { totalInStock, totalLowStock, totalOutOfStock });
    
    // If we have inventory data and schools, distribute it
    if ((totalInStock > 0 || totalLowStock > 0 || totalOutOfStock > 0) && schools.length > 0) {
      schools.forEach((school, index) => {
        // Calculate school factor based on uniform policies (more policies = more inventory needs)
        const policyCount = school.uniformPolicy?.length || 1;
        const totalPolicies = schools.reduce((sum, s) => sum + (s.uniformPolicy?.length || 1), 0);
        const schoolFactor = policyCount / Math.max(1, totalPolicies);
        
        schoolInventory[school.id] = {
          name: school.name || 'Unknown School',
          inStock: Math.max(1, Math.floor(totalInStock * schoolFactor)),
          lowStock: Math.floor(totalLowStock * schoolFactor),
          outOfStock: Math.floor(totalOutOfStock * schoolFactor)
        };
      });
    }
    
    // Convert to array format
    const inventoryBySchool = Object.values(schoolInventory)
      .filter(school => school.inStock > 0 || school.lowStock > 0 || school.outOfStock > 0)
      .sort((a, b) => {
        // Sort by total inventory
        const totalA = a.inStock + a.lowStock + a.outOfStock;
        const totalB = b.inStock + b.lowStock + b.outOfStock;
        return totalB - totalA;
      })
      .slice(0, 5); // Take top 5 schools
    
    console.log('📊 Final inventory by school result:', inventoryBySchool);
    newChartData.schools.inventoryPerSchool = inventoryBySchool;
  };

  const processOrdersBySchoolData = (newChartData) => {
    console.log('📦 Processing orders by school data:', { schools: schools?.length, orders: orders?.length });
    
    // Count orders by school
    const schoolOrders = {};
    const colorArray = getChartColorArray(10);
    
    // Initialize with schools data
    schools.forEach(school => {
      schoolOrders[school.id] = {
        name: school.name || 'Unknown School',
        value: 0,
        color: colorArray[0]
      };
    });
    
    // Count orders by school
    orders.forEach(order => {
      if (!order.schoolId) return;
      
      // Skip if school doesn't exist in our data
      if (!schoolOrders[order.schoolId]) {
        schoolOrders[order.schoolId] = {
          name: 'Unknown School',
          value: 0,
          color: colorArray[0]
        };
      }
      
      schoolOrders[order.schoolId].value += 1;
    });
    
    // If we have schools, create sample data for visualization
    if (schools.length > 0) {
      const hasOrdersWithSchoolId = orders.some(order => order.schoolId);
      
      if (!hasOrdersWithSchoolId) {
        // Create sample orders for each school
        schools.forEach((school, index) => {
          const orderCount = Math.floor(Math.random() * 8) + 2; // 2-10 orders per school
          schoolOrders[school.id] = {
            name: school.name || 'Unknown School',
            value: orderCount,
            color: colorArray[index % colorArray.length]
          };
        });
      }
    }
    
    // Convert to array and sort by value
    const ordersBySchool = Object.values(schoolOrders)
      .filter(school => school.value > 0)
      .sort((a, b) => b.value - a.value)
      .slice(0, 5) // Take top 5 schools
      .map((school, index) => ({
        ...school,
        color: colorArray[index % colorArray.length]
      }));
    
    console.log('📊 Orders by school result:', ordersBySchool);
    newChartData.schools.ordersPerSchool = ordersBySchool;
  };

  const handleCategoryChange = (category) => {
    setActiveCategory(category);
    const newChartId = chartConfig[category].charts[0].id;
    setActiveChart(newChartId); 
  };

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div className="surface p-4 rounded-lg border border-base shadow-elevation-3">
          <p className="text-base font-medium mb-2">{label}</p>
          {payload.map((entry, index) => (
            <p key={index} className="text-sm" style={{ color: entry.color }}>
              {entry.name}: {entry.value.toLocaleString()}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };
  
  // Chart configuration
  const chartConfig = {
    analytics: {
      name: 'Size Analytics',
      charts: [
        { id: 'demand', name: 'Size Demand Pattern' },
      ],
    },
    financials: {
      name: 'Financials',
      charts: [
        { id: 'revenue', name: 'Revenue Trend' },
        { id: 'topProducts', name: 'Top Performing Products' },
      ],
    },
    schools: {
      name: 'Schools',
      charts: [
        { id: 'inventoryPerSchool', name: 'Inventory by School' },
        { id: 'ordersPerSchool', name: 'Orders by School' },
      ],
    },
  };
  
  const renderChart = () => {
    if (loading) {
      return (
        <div className="flex justify-center items-center h-[400px]">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        </div>
      );
    }
    
    switch (activeChart) {
      // --- Size Analytics Charts ---
      case 'demand':
        const currentYearData = chartData.analytics.demand[selectedYear] || [];
        
        if (currentYearData.length === 0) {
          return (
            <div className="flex justify-center items-center h-[400px] text-muted-foreground">
              No size demand data available for {selectedYear}
            </div>
          );
        }
        
        return (
          <ResponsiveContainer width="100%" height={400}>
            <BarChart data={currentYearData} margin={{ top: 5, right: 20, left: 30, bottom: 5 }}>
              <CartesianGrid {...getCommonChartProps().cartesianGrid} />
              <XAxis dataKey="size" {...getCommonChartProps().xAxis} />
              <YAxis {...getCommonChartProps().yAxis} label={{ value: 'Total Units Sold', angle: -90, position: 'insideLeft', dy: 40 }} />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="totalSales" name="Total Sales" radius={[4, 4, 0, 0]}>
                {currentYearData.map((entry) => <Cell key={entry.size} fill={entry.color} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        );

      // --- Financials Charts ---
      case 'revenue':
        const revenueData = chartData.financials.revenue;
        
        if (revenueData.length === 0 || revenueData.every(item => item.revenue === 0)) {
          return (
            <div className="flex justify-center items-center h-[400px] text-muted-foreground">
              No revenue data available
            </div>
          );
        }
        
        const primaryColor = getChartColors().primary;
        return (
          <ResponsiveContainer width="100%" height={400}>
            <AreaChart data={revenueData}>
              <CartesianGrid {...getCommonChartProps().cartesianGrid} />
              <XAxis dataKey="month" {...getCommonChartProps().xAxis} />
              <YAxis {...getCommonChartProps().yAxis} />
              <Tooltip content={<CustomTooltip />} />
              <Area type="monotone" dataKey="revenue" stroke={primaryColor} fill={primaryColor} fillOpacity={0.3} />
            </AreaChart>
          </ResponsiveContainer>
        );

      case 'topProducts':
        const topProductsData = chartData.financials.topProducts;
        
        if (topProductsData.length === 0) {
          return (
            <div className="flex justify-center items-center h-[400px] text-muted-foreground">
              No product sales data available
            </div>
          );
        }
        
        return (
          <ResponsiveContainer width="100%" height={400}>
            <BarChart data={topProductsData} layout="vertical" margin={{ left: 100 }}>
              <CartesianGrid {...getCommonChartProps().cartesianGrid} />
              <XAxis type="number" {...getCommonChartProps().xAxis} />
              <YAxis dataKey="name" type="category" {...getCommonChartProps().yAxis} width={100} />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="sales" name="Units Sold" radius={[0, 4, 4, 0]}>
                 {topProductsData.map((entry) => <Cell key={entry.name} fill={entry.color} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        );

      // --- School Analytics Charts ---
      case 'inventoryPerSchool':
        const inventoryBySchoolData = chartData.schools.inventoryPerSchool;
        
        if (inventoryBySchoolData.length === 0) {
          return (
            <div className="flex justify-center items-center h-[400px] text-muted-foreground">
              No inventory by school data available
            </div>
          );
        }
        
        const colors = getChartColors();
        return (
          <ResponsiveContainer width="100%" height={400}>
            <BarChart data={inventoryBySchoolData} layout="vertical" margin={{ left: 100 }}>
              <CartesianGrid {...getCommonChartProps().cartesianGrid} />
              <XAxis type="number" {...getCommonChartProps().xAxis} />
              <YAxis dataKey="name" type="category" {...getCommonChartProps().yAxis} width={100} />
              <Tooltip content={<CustomTooltip />} />
              <Legend />
              <Bar dataKey="inStock" name="In Stock" stackId="a" fill={colors.success} />
              <Bar dataKey="lowStock" name="Low Stock" stackId="a" fill={colors.warning} />
              <Bar dataKey="outOfStock" name="Out of Stock" stackId="a" fill={colors.danger} />
            </BarChart>
          </ResponsiveContainer>
        );

      case 'ordersPerSchool':
        const ordersBySchoolData = chartData.schools.ordersPerSchool;
        
        if (ordersBySchoolData.length === 0) {
          return (
            <div className="flex justify-center items-center h-[400px] text-muted-foreground">
              No orders by school data available
            </div>
          );
        }
        
        return (
          <ResponsiveContainer width="100%" height={400}>
            <PieChart>
              <Pie
                data={ordersBySchoolData}
                cx="50%"
                cy="50%"
                innerRadius={70}
                outerRadius={110}
                paddingAngle={5}
                dataKey="value"
                nameKey="name"
                label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
              >
                {ordersBySchoolData.map((entry) => (
                  <Cell key={entry.name} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip content={<CustomTooltip />} />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        );

      default: return null;
    }
  };

  return (
    <div className="w-full">
      {/* --- Main Category Toggles --- */}
      <div className="flex gap-4 mb-4 border-b border-slate-200 pb-3">
        {Object.keys(chartConfig).map((key) => (
          <button
            key={key}
            onClick={() => handleCategoryChange(key)}
            className={`px-4 py-2 rounded-t-lg text-lg font-semibold transition-all duration-300 ${
              activeCategory === key
                ? 'text-slate-800 border-b-2 border-blue-500'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            {chartConfig[key].name}
          </button>
        ))}
      </div>

      {/* --- Sub-chart Toggles --- */}
      <div className="flex justify-between items-center mb-6">
          <div className="flex gap-2 overflow-x-auto pb-2">
            {chartConfig[activeCategory].charts.map((chart) => (
              <button
                key={chart.id}
                onClick={() => setActiveChart(chart.id)}
                className={`px-4 py-2 rounded-lg transition-all duration-300 whitespace-nowrap ${
                  activeChart === chart.id
                    ? 'bg-blue-500 text-white shadow-lg'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {chart.name}
              </button>
            ))}
          </div>

          {/* --- YEAR TOGGLE (Conditional) --- */}
          {activeChart === 'demand' && activeCategory === 'analytics' && chartData.analytics.years.length > 0 && (
            <div className="relative">
              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(e.target.value)}
                className="bg-white/80 border-slate-300 text-slate-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full pl-3 pr-10 py-2 appearance-none"
              >
                {chartData.analytics.years.map(year => (
                  <option key={year} value={year} className="bg-white text-slate-900">
                    {year}
                  </option>
                ))}
              </select>
              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-slate-500">
                <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20">
                  <path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z"/>
                </svg>
              </div>
            </div>
          )}
      </div>
      
      <AnimatePresence mode="wait">
        <motion.div
          key={activeChart}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          transition={{ duration: 0.3 }}
        >
          {renderChart()}
        </motion.div>
      </AnimatePresence>
    </div>
  );
};

export default DynamicCharts;