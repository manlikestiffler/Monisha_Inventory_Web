import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../config/firebase';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
    ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell, AreaChart, Area
} from 'recharts';
import {
    ArrowLeft, TrendingUp, DollarSign, Package, Percent,
    ArrowUpRight, ArrowDownRight, Calendar, Target
} from 'lucide-react';
import { useThemeDetector } from '../hooks/useThemeDetector';
import LoadingScreen from '../components/ui/LoadingScreen';
import SchoolSelect from '../components/SchoolSelect';
import { getChartColors, getCommonChartProps } from '../utils/chartColors';

const FinancialAnalyticsPage = () => {
    const navigate = useNavigate();
    const isDark = useThemeDetector();
    const [loading, setLoading] = useState(true);
    const [selectedSchool, setSelectedSchool] = useState('');
    const [uniformsData, setUniformsData] = useState([]);
    const [batchesData, setBatchesData] = useState([]);
    const [schoolsData, setSchoolsData] = useState([]);

    // Fetch all data
    useEffect(() => {
        const fetchAllData = async () => {
            setLoading(true);
            try {
                // Fetch uniforms with variants
                const uniformsSnapshot = await getDocs(collection(db, 'uniforms'));
                let uniforms = uniformsSnapshot.docs.map(doc => ({ ...doc.data(), id: doc.id }));

                const variantsSnapshot = await getDocs(collection(db, 'uniform_variants'));
                const variants = variantsSnapshot.docs.map(doc => ({ ...doc.data(), id: doc.id }));

                uniforms = uniforms.map(uniform => ({
                    ...uniform,
                    variants: variants.filter(v => v.uniformId === uniform.id)
                }));
                setUniformsData(uniforms);

                // Fetch batches
                const batchesSnapshot = await getDocs(collection(db, 'batchInventory'));
                const batches = batchesSnapshot.docs.map(doc => ({ ...doc.data(), id: doc.id }));
                setBatchesData(batches);

                // Fetch schools
                const schoolsSnapshot = await getDocs(collection(db, 'schools'));
                const schools = schoolsSnapshot.docs.map(doc => ({ ...doc.data(), id: doc.id }));
                setSchoolsData(schools);
            } catch (error) {
                console.error('Error fetching financial data:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchAllData();
    }, []);

    // Filter by school
    const getFilteredUniforms = useCallback(() => {
        if (!selectedSchool) return uniformsData;
        return uniformsData.filter(u => u.school === selectedSchool || u.schoolId === selectedSchool);
    }, [uniformsData, selectedSchool]);

    const getFilteredBatches = useCallback(() => {
        if (!selectedSchool) return batchesData;
        return batchesData.filter(b => b.schoolId === selectedSchool);
    }, [batchesData, selectedSchool]);

    // Get all allocations (sold items)
    const getAllocations = useCallback(() => {
        const allocations = [];
        getFilteredUniforms().forEach(uniform => {
            if (uniform.variants) {
                uniform.variants.forEach(variant => {
                    if (variant.allocationHistory && Array.isArray(variant.allocationHistory)) {
                        variant.allocationHistory.forEach(allocation => {
                            // Find cost price from batch
                            let costPrice = 0;
                            batchesData.forEach(batch => {
                                batch.items?.forEach(item => {
                                    if (item.variantType === variant.variantType) {
                                        costPrice = item.price || 0;
                                    }
                                });
                            });

                            allocations.push({
                                ...allocation,
                                productId: uniform.id,
                                productName: uniform.name,
                                schoolId: uniform.school || uniform.schoolId,
                                sellingPrice: allocation.price || uniform.price || 0,
                                costPrice: costPrice,
                                quantity: allocation.quantity || 1,
                                allocatedAt: allocation.allocatedAt || allocation.date
                            });
                        });
                    }
                });
            }
        });
        return allocations;
    }, [getFilteredUniforms, batchesData]);

    // Calculate totals
    const getTotalRevenue = useCallback(() => {
        return getAllocations().reduce((sum, a) => sum + (a.quantity * a.sellingPrice), 0);
    }, [getAllocations]);

    const getTotalCost = useCallback(() => {
        return getAllocations().reduce((sum, a) => sum + (a.quantity * a.costPrice), 0);
    }, [getAllocations]);

    const getGrossProfit = useCallback(() => {
        return getTotalRevenue() - getTotalCost();
    }, [getTotalRevenue, getTotalCost]);

    const getProfitMargin = useCallback(() => {
        const revenue = getTotalRevenue();
        if (revenue === 0) return 0;
        return ((getGrossProfit() / revenue) * 100).toFixed(1);
    }, [getTotalRevenue, getGrossProfit]);

    // Get product profitability data
    const getProductProfitability = useCallback(() => {
        const productMap = {};

        getAllocations().forEach(allocation => {
            if (!productMap[allocation.productId]) {
                productMap[allocation.productId] = {
                    name: allocation.productName,
                    unitsSold: 0,
                    revenue: 0,
                    cost: 0,
                    profit: 0
                };
            }
            productMap[allocation.productId].unitsSold += allocation.quantity;
            productMap[allocation.productId].revenue += allocation.quantity * allocation.sellingPrice;
            productMap[allocation.productId].cost += allocation.quantity * allocation.costPrice;
            productMap[allocation.productId].profit += allocation.quantity * (allocation.sellingPrice - allocation.costPrice);
        });

        return Object.values(productMap).sort((a, b) => b.profit - a.profit);
    }, [getAllocations]);

    // Get monthly trend data
    const getMonthlyTrend = useCallback(() => {
        const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        const monthlyData = {};

        getAllocations().forEach(allocation => {
            if (allocation.allocatedAt) {
                const date = new Date(allocation.allocatedAt);
                const key = `${date.getFullYear()}-${date.getMonth()}`;
                if (!monthlyData[key]) {
                    monthlyData[key] = {
                        name: `${monthNames[date.getMonth()]} ${date.getFullYear()}`,
                        revenue: 0,
                        cost: 0,
                        profit: 0,
                        sortKey: date.getTime()
                    };
                }
                monthlyData[key].revenue += allocation.quantity * allocation.sellingPrice;
                monthlyData[key].cost += allocation.quantity * allocation.costPrice;
                monthlyData[key].profit += allocation.quantity * (allocation.sellingPrice - allocation.costPrice);
            }
        });

        return Object.values(monthlyData).sort((a, b) => a.sortKey - b.sortKey).slice(-12);
    }, [getAllocations]);

    // Get school profitability
    const getSchoolProfitability = useCallback(() => {
        const schoolMap = {};

        getAllocations().forEach(allocation => {
            const schoolId = allocation.schoolId;
            const school = schoolsData.find(s => s.id === schoolId);
            const schoolName = school?.name || 'Unknown School';

            if (!schoolMap[schoolId]) {
                schoolMap[schoolId] = {
                    name: schoolName,
                    revenue: 0,
                    cost: 0,
                    profit: 0
                };
            }
            schoolMap[schoolId].revenue += allocation.quantity * allocation.sellingPrice;
            schoolMap[schoolId].cost += allocation.quantity * allocation.costPrice;
            schoolMap[schoolId].profit += allocation.quantity * (allocation.sellingPrice - allocation.costPrice);
        });

        return Object.values(schoolMap).sort((a, b) => b.profit - a.profit);
    }, [getAllocations, schoolsData]);

    // 5-Year Forecast using linear regression
    const getForecast = useCallback(() => {
        const monthlyData = getMonthlyTrend();
        if (monthlyData.length < 2) {
            return { yearsData: [], projectedProfit: 0 };
        }

        // Calculate monthly growth rate
        const profits = monthlyData.map(m => m.profit);
        const n = profits.length;

        // Simple linear regression
        let sumX = 0, sumY = 0, sumXY = 0, sumXX = 0;
        for (let i = 0; i < n; i++) {
            sumX += i;
            sumY += profits[i];
            sumXY += i * profits[i];
            sumXX += i * i;
        }

        const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX) || 0;
        const intercept = (sumY - slope * sumX) / n;

        // Project 5 years (60 months)
        const currentYear = new Date().getFullYear();
        const yearsData = [];

        for (let year = 0; year <= 5; year++) {
            const monthsFromNow = year * 12;
            const projectedMonthlyProfit = intercept + slope * (n + monthsFromNow);
            const annualProfit = projectedMonthlyProfit * 12;

            yearsData.push({
                year: currentYear + year,
                projectedProfit: Math.max(0, annualProfit),
                label: year === 0 ? 'Current' : `Year ${year}`
            });
        }

        return {
            yearsData,
            projectedProfit: yearsData[5]?.projectedProfit || 0,
            monthlyGrowth: slope
        };
    }, [getMonthlyTrend]);

    const colors = getChartColors();

    if (loading) {
        return <LoadingScreen message="Loading Financial Analytics" description="Calculating profits and forecasts..." />;
    }

    const forecast = getForecast();

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-black p-4 sm:p-6 lg:p-8">
            <div className="max-w-7xl mx-auto space-y-6">
                {/* Header */}
                <div className="flex items-center justify-between bg-white dark:bg-gray-900 p-6 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm">
                    <div className="flex items-center gap-4">
                        <button
                            onClick={() => navigate('/inventory')}
                            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl transition-colors"
                        >
                            <ArrowLeft className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                        </button>
                        <div>
                            <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Financial Analytics</h1>
                            <p className="text-gray-500 dark:text-gray-400">Profit tracking and revenue forecasting</p>
                        </div>
                    </div>
                </div>

                {/* School Filter */}
                <div className="bg-white dark:bg-gray-900 p-4 rounded-xl border border-gray-200 dark:border-gray-700">
                    <SchoolSelect onChange={setSelectedSchool} value={selectedSchool} />
                </div>

                {/* Summary Cards */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="bg-white dark:bg-gray-900 p-6 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm"
                    >
                        <div className="flex items-center gap-4">
                            <div className="p-3 bg-green-100 dark:bg-green-900/30 rounded-xl">
                                <DollarSign className="w-6 h-6 text-green-600 dark:text-green-400" />
                            </div>
                            <div>
                                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Total Revenue</p>
                                <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">${getTotalRevenue().toLocaleString()}</p>
                            </div>
                        </div>
                    </motion.div>

                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.1 }}
                        className="bg-white dark:bg-gray-900 p-6 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm"
                    >
                        <div className="flex items-center gap-4">
                            <div className="p-3 bg-red-100 dark:bg-red-900/30 rounded-xl">
                                <Package className="w-6 h-6 text-red-600 dark:text-red-400" />
                            </div>
                            <div>
                                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Total Cost</p>
                                <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">${getTotalCost().toLocaleString()}</p>
                            </div>
                        </div>
                    </motion.div>

                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.2 }}
                        className="bg-white dark:bg-gray-900 p-6 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm"
                    >
                        <div className="flex items-center gap-4">
                            <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-xl">
                                <TrendingUp className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                            </div>
                            <div>
                                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Gross Profit</p>
                                <p className={`text-2xl font-bold ${getGrossProfit() >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                    ${getGrossProfit().toLocaleString()}
                                </p>
                            </div>
                        </div>
                    </motion.div>

                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.3 }}
                        className="bg-white dark:bg-gray-900 p-6 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm"
                    >
                        <div className="flex items-center gap-4">
                            <div className="p-3 bg-purple-100 dark:bg-purple-900/30 rounded-xl">
                                <Percent className="w-6 h-6 text-purple-600 dark:text-purple-400" />
                            </div>
                            <div>
                                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Profit Margin</p>
                                <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{getProfitMargin()}%</p>
                            </div>
                        </div>
                    </motion.div>
                </div>

                {/* Charts Row */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Monthly Trend */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.4 }}
                        className="bg-white dark:bg-gray-900 p-6 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm"
                    >
                        <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100 mb-4">Revenue & Profit Trend</h2>
                        <ResponsiveContainer width="100%" height={300}>
                            <AreaChart data={getMonthlyTrend()}>
                                <defs>
                                    <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor={colors.primary} stopOpacity={0.3} />
                                        <stop offset="95%" stopColor={colors.primary} stopOpacity={0} />
                                    </linearGradient>
                                    <linearGradient id="colorProfit" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor={colors.success} stopOpacity={0.3} />
                                        <stop offset="95%" stopColor={colors.success} stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" stroke={isDark ? '#374151' : '#e5e7eb'} />
                                <XAxis dataKey="name" tick={{ fontSize: 12 }} stroke={isDark ? '#9ca3af' : '#6b7280'} />
                                <YAxis tick={{ fontSize: 12 }} stroke={isDark ? '#9ca3af' : '#6b7280'} />
                                <Tooltip
                                    formatter={(value) => `$${value.toLocaleString()}`}
                                    contentStyle={{ backgroundColor: isDark ? '#1f2937' : '#fff', border: 'none', borderRadius: '8px' }}
                                />
                                <Legend />
                                <Area type="monotone" dataKey="revenue" name="Revenue" stroke={colors.primary} fillOpacity={1} fill="url(#colorRevenue)" />
                                <Area type="monotone" dataKey="profit" name="Profit" stroke={colors.success} fillOpacity={1} fill="url(#colorProfit)" />
                            </AreaChart>
                        </ResponsiveContainer>
                    </motion.div>

                    {/* 5-Year Forecast */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.5 }}
                        className="bg-white dark:bg-gray-900 p-6 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm"
                    >
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100">5-Year Profit Forecast</h2>
                            <div className="flex items-center gap-2 text-sm">
                                <Target className="w-4 h-4 text-purple-500" />
                                <span className="text-gray-500 dark:text-gray-400">
                                    Projected: <span className="font-bold text-purple-600">${forecast.projectedProfit.toLocaleString()}</span>
                                </span>
                            </div>
                        </div>
                        <ResponsiveContainer width="100%" height={300}>
                            <BarChart data={forecast.yearsData}>
                                <CartesianGrid strokeDasharray="3 3" stroke={isDark ? '#374151' : '#e5e7eb'} />
                                <XAxis dataKey="year" tick={{ fontSize: 12 }} stroke={isDark ? '#9ca3af' : '#6b7280'} />
                                <YAxis tick={{ fontSize: 12 }} stroke={isDark ? '#9ca3af' : '#6b7280'} />
                                <Tooltip
                                    formatter={(value) => `$${value.toLocaleString()}`}
                                    contentStyle={{ backgroundColor: isDark ? '#1f2937' : '#fff', border: 'none', borderRadius: '8px' }}
                                />
                                <Bar dataKey="projectedProfit" name="Projected Profit" fill={colors.primary} radius={[4, 4, 0, 0]}>
                                    {forecast.yearsData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={index === 0 ? colors.success : colors.primary} />
                                    ))}
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                        {forecast.monthlyGrowth > 0 && (
                            <div className="mt-4 flex items-center gap-2 text-sm text-green-600">
                                <ArrowUpRight className="w-4 h-4" />
                                <span>Growing at ${forecast.monthlyGrowth.toFixed(2)}/month based on current trend</span>
                            </div>
                        )}
                        {forecast.monthlyGrowth < 0 && (
                            <div className="mt-4 flex items-center gap-2 text-sm text-red-600">
                                <ArrowDownRight className="w-4 h-4" />
                                <span>Declining at ${Math.abs(forecast.monthlyGrowth).toFixed(2)}/month based on current trend</span>
                            </div>
                        )}
                    </motion.div>
                </div>

                {/* Product Profitability Table */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.6 }}
                    className="bg-white dark:bg-gray-900 p-6 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm"
                >
                    <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100 mb-4">Product Profitability</h2>
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                            <thead className="bg-gray-50 dark:bg-gray-800">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Product</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Units Sold</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Revenue</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Cost</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Profit</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Margin</th>
                                </tr>
                            </thead>
                            <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-700">
                                {getProductProfitability().slice(0, 10).map((product, index) => (
                                    <tr key={index} className="hover:bg-gray-50 dark:hover:bg-gray-800">
                                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-gray-100">
                                            {product.name}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                                            {product.unitsSold}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                                            ${product.revenue.toLocaleString()}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                                            ${product.cost.toLocaleString()}
                                        </td>
                                        <td className={`px-6 py-4 whitespace-nowrap text-sm font-medium ${product.profit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                            ${product.profit.toLocaleString()}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                                            {product.revenue > 0 ? ((product.profit / product.revenue) * 100).toFixed(1) : 0}%
                                        </td>
                                    </tr>
                                ))}
                                {getProductProfitability().length === 0 && (
                                    <tr>
                                        <td colSpan={6} className="px-6 py-8 text-center text-gray-500 dark:text-gray-400">
                                            No sales data available yet
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </motion.div>

                {/* School Profitability */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.7 }}
                    className="bg-white dark:bg-gray-900 p-6 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm"
                >
                    <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100 mb-4">School Profitability</h2>
                    <ResponsiveContainer width="100%" height={300}>
                        <BarChart data={getSchoolProfitability().slice(0, 8)} layout="vertical">
                            <CartesianGrid strokeDasharray="3 3" stroke={isDark ? '#374151' : '#e5e7eb'} />
                            <XAxis type="number" tick={{ fontSize: 12 }} stroke={isDark ? '#9ca3af' : '#6b7280'} />
                            <YAxis type="category" dataKey="name" width={150} tick={{ fontSize: 11 }} stroke={isDark ? '#9ca3af' : '#6b7280'} />
                            <Tooltip
                                formatter={(value) => `$${value.toLocaleString()}`}
                                contentStyle={{ backgroundColor: isDark ? '#1f2937' : '#fff', border: 'none', borderRadius: '8px' }}
                            />
                            <Legend />
                            <Bar dataKey="revenue" name="Revenue" fill={colors.primary} radius={[0, 4, 4, 0]} />
                            <Bar dataKey="profit" name="Profit" fill={colors.success} radius={[0, 4, 4, 0]} />
                        </BarChart>
                    </ResponsiveContainer>
                </motion.div>
            </div>
        </div>
    );
};

export default FinancialAnalyticsPage;
