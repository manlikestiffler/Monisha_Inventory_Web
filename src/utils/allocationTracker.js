import { doc, getDoc, updateDoc, arrayUnion } from 'firebase/firestore';
import { db } from '../config/firebase';

/**
 * Record an allocation from batch to product
 * @param {string} batchId - The batch ID
 * @param {object} allocationData - Data about the allocation
 * @param {string} allocationData.productId - Product receiving allocation
 * @param {string} allocationData.productName - Product name
 * @param {string} allocationData.schoolId - School the product is for
 * @param {string} allocationData.schoolName - School name
 * @param {string} allocationData.variantType - Variant type (e.g., "Short Sleeve Shirt")
 * @param {string} allocationData.color - Color
 * @param {string} allocationData.size - Size
 * @param {number} allocationData.quantity - Quantity allocated
 * @param {string} allocationData.allocatedBy - User ID who made allocation
 * @param {string} allocationData.allocatedByName - User name
 */
export const recordBatchAllocation = async (batchId, allocationData) => {
    try {
        const batchRef = doc(db, 'batchInventory', batchId);
        const batchDoc = await getDoc(batchRef);

        if (!batchDoc.exists()) {
            console.warn(`Batch ${batchId} not found for allocation recording`);
            return false;
        }

        const batchData = batchDoc.data();
        const updatedItems = [...(batchData.items || [])];

        // Find the matching item
        const itemIndex = updatedItems.findIndex(item =>
            item.variantType === allocationData.variantType &&
            item.color === allocationData.color
        );

        if (itemIndex === -1) {
            console.warn(`Item ${allocationData.variantType} ${allocationData.color} not found in batch`);
            return false;
        }

        // Find the matching size
        const sizeIndex = updatedItems[itemIndex].sizes?.findIndex(s =>
            s.size === allocationData.size
        );

        if (sizeIndex === -1) {
            console.warn(`Size ${allocationData.size} not found in item`);
            return false;
        }

        // Update size with allocation tracking
        const sizeData = updatedItems[itemIndex].sizes[sizeIndex];

        // If originalQuantity not set, set it now (for existing data migration)
        if (sizeData.originalQuantity === undefined) {
            sizeData.originalQuantity = (sizeData.quantity || 0) + allocationData.quantity;
        }

        // Update allocated count
        sizeData.allocated = (sizeData.allocated || 0) + allocationData.quantity;

        // Add to allocation log
        if (!sizeData.allocationLog) {
            sizeData.allocationLog = [];
        }

        sizeData.allocationLog.push({
            productId: allocationData.productId,
            productName: allocationData.productName,
            schoolId: allocationData.schoolId,
            schoolName: allocationData.schoolName,
            quantityAllocated: allocationData.quantity,
            allocatedAt: new Date().toISOString(),
            allocatedBy: allocationData.allocatedBy,
            allocatedByName: allocationData.allocatedByName
        });

        updatedItems[itemIndex].sizes[sizeIndex] = sizeData;

        await updateDoc(batchRef, {
            items: updatedItems,
            updatedAt: new Date()
        });

        console.log('✅ Batch allocation recorded:', allocationData);
        return true;
    } catch (error) {
        console.error('Error recording batch allocation:', error);
        return false;
    }
};

/**
 * Get allocation summary for a batch
 * @param {object} batch - The batch object with items
 * @returns {object} Summary of allocated vs unallocated
 */
export const getBatchAllocationSummary = (batch) => {
    if (!batch || !batch.items) {
        return {
            totalOriginal: 0,
            totalAllocated: 0,
            totalUnallocated: 0,
            allocatedValue: 0,
            unallocatedValue: 0,
            allocationsByProduct: [],
            unallocatedItems: []
        };
    }

    let totalOriginal = 0;
    let totalAllocated = 0;
    let totalUnallocated = 0;
    let allocatedValue = 0;
    let unallocatedValue = 0;
    const allocationsByProduct = {};
    const unallocatedItems = [];

    batch.items.forEach(item => {
        const price = item.price || 0;

        (item.sizes || []).forEach(size => {
            const quantity = size.quantity || 0;
            const allocated = size.allocated || 0;
            const original = size.originalQuantity || (quantity + allocated);

            totalOriginal += original;
            totalAllocated += allocated;
            totalUnallocated += quantity;
            allocatedValue += allocated * price;
            unallocatedValue += quantity * price;

            // Track unallocated items
            if (quantity > 0) {
                unallocatedItems.push({
                    batchId: batch.id,
                    batchName: batch.name,
                    variantType: item.variantType,
                    color: item.color,
                    size: size.size,
                    quantity: quantity,
                    price: price,
                    value: quantity * price
                });
            }

            // Track allocations by product
            (size.allocationLog || []).forEach(allocation => {
                const key = allocation.productId || 'unknown';
                if (!allocationsByProduct[key]) {
                    allocationsByProduct[key] = {
                        productId: allocation.productId,
                        productName: allocation.productName,
                        schoolId: allocation.schoolId,
                        schoolName: allocation.schoolName,
                        totalQuantity: 0,
                        allocations: []
                    };
                }
                allocationsByProduct[key].totalQuantity += allocation.quantityAllocated;
                allocationsByProduct[key].allocations.push({
                    ...allocation,
                    variantType: item.variantType,
                    color: item.color,
                    size: size.size
                });
            });
        });
    });

    return {
        totalOriginal,
        totalAllocated,
        totalUnallocated,
        allocatedValue,
        unallocatedValue,
        allocationRate: totalOriginal > 0 ? (totalAllocated / totalOriginal * 100).toFixed(1) : 0,
        allocationsByProduct: Object.values(allocationsByProduct),
        unallocatedItems
    };
};

/**
 * Get complete product flow from batch to students
 * @param {object} batch - Batch data
 * @param {array} products - Products data
 * @param {array} students - Students data
 * @returns {object} Complete flow tree
 */
export const getProductFlow = (batch, products, students) => {
    if (!batch || !batch.items) return null;

    const summary = getBatchAllocationSummary(batch);

    const flow = {
        batch: {
            id: batch.id,
            name: batch.name,
            totalItems: summary.totalOriginal,
            allocatedItems: summary.totalAllocated,
            unallocatedItems: summary.totalUnallocated,
            allocationRate: summary.allocationRate
        },
        products: [],
        unallocated: summary.unallocatedItems
    };

    // Build product flows
    summary.allocationsByProduct.forEach(productAllocation => {
        const product = products?.find(p => p.id === productAllocation.productId);

        const productFlow = {
            ...productAllocation,
            currentStock: 0,
            distributedToStudents: 0,
            studentAllocations: []
        };

        if (product && product.variants) {
            // Calculate current stock in product
            product.variants.forEach(variant => {
                (variant.sizes || []).forEach(size => {
                    productFlow.currentStock += size.quantity || 0;
                });

                // Get student allocations from allocationHistory
                (variant.allocationHistory || []).forEach(allocation => {
                    productFlow.distributedToStudents += allocation.quantity || 0;

                    const student = students?.find(s => s.id === allocation.studentId);
                    productFlow.studentAllocations.push({
                        studentId: allocation.studentId,
                        studentName: student?.name || 'Unknown Student',
                        size: allocation.size,
                        quantity: allocation.quantity,
                        allocatedAt: allocation.allocatedAt
                    });
                });
            });
        }

        flow.products.push(productFlow);
    });

    return flow;
};

/**
 * Get aggregated allocation data across all batches
 * @param {array} batches - Array of batch objects
 * @returns {object} Aggregated allocation summary
 */
export const getAggregatedAllocationData = (batches) => {
    let totalOriginal = 0;
    let totalAllocated = 0;
    let totalUnallocated = 0;
    let allocatedValue = 0;
    let unallocatedValue = 0;
    const allUnallocatedItems = [];

    (batches || []).forEach(batch => {
        const summary = getBatchAllocationSummary(batch);
        totalOriginal += summary.totalOriginal;
        totalAllocated += summary.totalAllocated;
        totalUnallocated += summary.totalUnallocated;
        allocatedValue += summary.allocatedValue;
        unallocatedValue += summary.unallocatedValue;
        allUnallocatedItems.push(...summary.unallocatedItems);
    });

    return {
        totalOriginal,
        totalAllocated,
        totalUnallocated,
        allocatedValue,
        unallocatedValue,
        allocationRate: totalOriginal > 0 ? (totalAllocated / totalOriginal * 100).toFixed(1) : 0,
        unallocatedItems: allUnallocatedItems
    };
};
