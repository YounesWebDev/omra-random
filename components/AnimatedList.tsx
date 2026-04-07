"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import { motion, useInView } from "motion/react";

type AnimatedListItem =
  | string
  | {
      label?: string;
      value?: string;
      className?: string;
      content?: ReactNode;
    };

interface NormalizedItem {
  label: string;
  value: string;
  className: string;
  content: ReactNode;
}

interface AnimatedItemProps {
  children: ReactNode;
  delay?: number;
  index: number;
  isSelected: boolean;
  onMouseEnter: () => void;
  onClick: () => void;
}

interface AnimatedListProps {
  items?: AnimatedListItem[];
  onItemSelect?: (item: string, index: number) => void;
  showGradients?: boolean;
  enableArrowNavigation?: boolean;
  className?: string;
  itemClassName?: string;
  displayScrollbar?: boolean;
  initialSelectedIndex?: number;
}

const normalizeItem = (item: AnimatedListItem): NormalizedItem => {
  if (typeof item === "string") {
    return {
      label: item,
      value: item,
      className: "",
      content: null,
    };
  }

  return {
    label: item.label ?? "",
    value: item.value ?? item.label ?? "",
    className: item.className ?? "",
    content: item.content ?? null,
  };
};

const AnimatedItem = ({
  children,
  delay = 0,
  index,
  isSelected,
  onMouseEnter,
  onClick,
}: AnimatedItemProps) => {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { amount: 0.5, once: false });

  return (
    <motion.div
      ref={ref}
      data-index={index}
      onMouseEnter={onMouseEnter}
      onClick={onClick}
      initial={{ opacity: 0, y: 18, scale: 0.985 }}
      animate={
        inView
          ? {
              opacity: 1,
              y: 0,
              scale: isSelected ? 1.01 : 1,
            }
          : { opacity: 0, y: 18, scale: 0.985 }
      }
      transition={{
        duration: 0.14,
        delay,
        ease: [0.22, 1, 0.36, 1],
      }}
      className="mb-3 cursor-pointer will-change-transform"
    >
      {children}
    </motion.div>
  );
};

export default function AnimatedList({
  items = ["Item 1", "Item 2", "Item 3"],
  onItemSelect,
  showGradients = true,
  enableArrowNavigation = true,
  className = "",
  itemClassName = "",
  displayScrollbar = true,
  initialSelectedIndex = -1,
}: AnimatedListProps) {
  const listRef = useRef<HTMLDivElement>(null);
  const [selectedIndex, setSelectedIndex] = useState(initialSelectedIndex);
  const [keyboardNav, setKeyboardNav] = useState(false);
  const [topGradientOpacity, setTopGradientOpacity] = useState(0);
  const [bottomGradientOpacity, setBottomGradientOpacity] = useState(1);

  const handleItemMouseEnter = useCallback((index: number) => {
    setSelectedIndex(index);
  }, []);

  const handleItemClick = useCallback(
    (item: string, index: number) => {
      setSelectedIndex(index);
      onItemSelect?.(item, index);
    },
    [onItemSelect],
  );

  const handleScroll = useCallback((event: React.UIEvent<HTMLDivElement>) => {
    const { scrollTop, scrollHeight, clientHeight } = event.currentTarget;
    setTopGradientOpacity(Math.min(scrollTop / 50, 1));
    const bottomDistance = scrollHeight - (scrollTop + clientHeight);
    setBottomGradientOpacity(scrollHeight <= clientHeight ? 0 : Math.min(bottomDistance / 50, 1));
  }, []);

  useEffect(() => {
    if (!enableArrowNavigation) {
      return;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "ArrowDown" || (event.key === "Tab" && !event.shiftKey)) {
        event.preventDefault();
        setKeyboardNav(true);
        setSelectedIndex((previous) => Math.min(previous + 1, items.length - 1));
      } else if (event.key === "ArrowUp" || (event.key === "Tab" && event.shiftKey)) {
        event.preventDefault();
        setKeyboardNav(true);
        setSelectedIndex((previous) => Math.max(previous - 1, 0));
      } else if (event.key === "Enter" && selectedIndex >= 0 && selectedIndex < items.length) {
        event.preventDefault();
        onItemSelect?.(normalizeItem(items[selectedIndex]).value, selectedIndex);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [enableArrowNavigation, items, onItemSelect, selectedIndex]);

  useEffect(() => {
    if (!keyboardNav || selectedIndex < 0 || !listRef.current) {
      return;
    }

    const container = listRef.current;
    const selectedItem = container.querySelector<HTMLElement>(`[data-index="${selectedIndex}"]`);
    if (!selectedItem) {
      setKeyboardNav(false);
      return;
    }

    const extraMargin = 50;
    const containerScrollTop = container.scrollTop;
    const containerHeight = container.clientHeight;
    const itemTop = selectedItem.offsetTop;
    const itemBottom = itemTop + selectedItem.offsetHeight;

    if (itemTop < containerScrollTop + extraMargin) {
      container.scrollTo({ top: itemTop - extraMargin, behavior: "smooth" });
    } else if (itemBottom > containerScrollTop + containerHeight - extraMargin) {
      container.scrollTo({
        top: itemBottom - containerHeight + extraMargin,
        behavior: "smooth",
      });
    }

    setKeyboardNav(false);
  }, [keyboardNav, selectedIndex]);

  return (
    <div className={`relative w-full ${className}`}>
      <div
        ref={listRef}
        className={`max-h-[400px] overflow-y-auto p-4 ${
          displayScrollbar
            ? "[&::-webkit-scrollbar]:w-[8px] [&::-webkit-scrollbar-track]:bg-[#060010] [&::-webkit-scrollbar-thumb]:bg-[#222] [&::-webkit-scrollbar-thumb]:rounded-[4px]"
            : "scrollbar-hide"
        }`}
        onScroll={handleScroll}
        style={{
          scrollbarWidth: displayScrollbar ? "thin" : "none",
          scrollbarColor: "#222 #060010",
        }}
      >
        {items.map((item, index) => {
          const normalizedItem = normalizeItem(item);

          return (
            <AnimatedItem
              key={`${normalizedItem.label}-${index}`}
              delay={index * 0.015}
              index={index}
              isSelected={selectedIndex === index}
              onMouseEnter={() => handleItemMouseEnter(index)}
              onClick={() => handleItemClick(normalizedItem.value, index)}
            >
              <div
                className={`rounded-lg p-4 ${
                  selectedIndex === index ? "bg-[#222]" : "bg-[#111]"
                } ${itemClassName} ${normalizedItem.className}`}
              >
                {normalizedItem.content ?? <p className="m-0 text-white">{normalizedItem.label}</p>}
              </div>
            </AnimatedItem>
          );
        })}
      </div>

      {showGradients && (
        <>
          <div
            className="pointer-events-none absolute top-0 right-0 left-0 h-[50px] bg-gradient-to-b from-[#060010] to-transparent transition-opacity duration-300 ease"
            style={{ opacity: topGradientOpacity }}
          />
          <div
            className="pointer-events-none absolute right-0 bottom-0 left-0 h-[100px] bg-gradient-to-t from-[#060010] to-transparent transition-opacity duration-300 ease"
            style={{ opacity: bottomGradientOpacity }}
          />
        </>
      )}
    </div>
  );
}
