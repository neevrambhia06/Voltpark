import React, { useRef, useEffect, useState } from 'react';

const WheelPicker = ({ items, value, onChange, label, infinite = false }) => {
    const containerRef = useRef(null);
    const itemHeight = 48; // Fixed height in pixels (h-[48px] via tailwind instead of h-12)
    const [isScrolling, setIsScrolling] = useState(false);

    // Prepare display items:
    // If infinite, we render [set1, set2, set3] -> we operate in set2
    const displayItems = infinite ? [...items, ...items, ...items] : items;

    // Calculate offset for the middle set (if infinite)
    const infiniteOffset = infinite ? items.length * itemHeight : 0;

    // Scroll to value on mount or change (if not currently scrolling manually)
    useEffect(() => {
        if (containerRef.current && !isScrolling) {
            const selectedIndex = items.findIndex(item => item.value === value);
            if (selectedIndex !== -1) {
                // If infinite, target the middle set (index + items.length)
                const targetIndex = infinite ? selectedIndex + items.length : selectedIndex;
                containerRef.current.scrollTop = targetIndex * itemHeight;
            }
        }
    }, [value, items, infinite, isScrolling]);

    // Infinite Scroll Loop Logic
    const handleScroll = (e) => {
        if (!infinite) return;

        const container = e.target;
        const totalHeight = items.length * itemHeight;

        // If scrolled near top (into first set), jump to middle set
        if (container.scrollTop < itemHeight) {
            container.scrollTop = container.scrollTop + totalHeight;
        }
        // If scrolled near bottom (into third set), jump to middle set
        else if (container.scrollTop > totalHeight * 2 - itemHeight * 4) { // Buffer for visible area
            container.scrollTop = container.scrollTop - totalHeight;
        }
    };

    // Selection Logic on Scroll End
    const handleScrollEnd = () => {
        setIsScrolling(false);
        if (containerRef.current) {
            const scrollTop = containerRef.current.scrollTop;
            const rawIndex = Math.round(scrollTop / itemHeight);

            // Map raw index back to original item index
            const normalizedIndex = rawIndex % items.length;

            if (items[normalizedIndex] && items[normalizedIndex].value !== value) {
                onChange(items[normalizedIndex].value);
            }
        }
    };

    // Debounce scroll handler for snapping/selection
    let timeoutId = useRef(null);
    const onScroll = (e) => {
        setIsScrolling(true);
        handleScroll(e); // Infinite check

        if (timeoutId.current) clearTimeout(timeoutId.current);
        timeoutId.current = setTimeout(handleScrollEnd, 100);
    };

    return (
        <div className="flex flex-col items-center">
            {label && <span className="text-xs font-bold text-gray-400 uppercase mb-2 tracking-wider">{label}</span>}
            <div className="relative h-[192px] w-full overflow-hidden">
                {/* Selection Indicator */}
                <div className="absolute top-1/2 left-0 right-0 -translate-y-1/2 h-[48px] border-t border-b border-gray-100 bg-gray-50/50 pointer-events-none z-0"></div>

                {/* Scroll Container */}
                <div
                    ref={containerRef}
                    className="h-full w-full overflow-y-auto snap-y snap-mandatory scroll-smooth no-scrollbar relative z-10"
                    onScroll={onScroll}
                    style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
                >
                    {/* Padding for center alignment */}
                    <div style={{ height: `${itemHeight * 1.5}px` }}></div>

                    {displayItems.map((item, index) => {
                        // Correctly checking value equality even for duplicates
                        const isActive = item.value === value;
                        return (
                            <div
                                key={`${item.value}-${index}`} // Unique key for duplicates
                                onClick={() => {
                                    setIsScrolling(false);
                                    onChange(item.value);
                                }}
                                className={`h-[48px] flex items-center justify-center snap-center cursor-pointer transition-all duration-200 whitespace-nowrap
                                    ${isActive ? 'text-gray-900 font-extrabold text-lg scale-100' : 'text-gray-300 font-medium text-base scale-90 blur-[0.5px]'}`
                                }
                            >
                                {item.label}
                            </div>
                        );
                    })}

                    <div style={{ height: `${itemHeight * 1.5}px` }}></div>
                </div>
            </div>
        </div>
    );
};

export default WheelPicker;
