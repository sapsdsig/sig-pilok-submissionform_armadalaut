import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from "react";

type SearchableSelectProps = {
  id: string;
  options: string[];
  value: string;
  placeholder?: string;
  disabled?: boolean;
  invalid?: boolean;
  describedBy?: string;
  onChange: (value: string) => void;
};

export const SearchableSelect = forwardRef<HTMLInputElement, SearchableSelectProps>(
  function SearchableSelect(
    {
      id,
      options,
      value,
      placeholder = "Cari dan pilih distributor...",
      disabled,
      invalid,
      describedBy,
      onChange,
    },
    forwardedRef,
  ) {
    const [isOpen, setIsOpen] = useState(false);
    const [query, setQuery] = useState("");
    const [activeIndex, setActiveIndex] = useState(0);
    const rootRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);
    const listboxId = `${id}-listbox`;

    useImperativeHandle(forwardedRef, () => inputRef.current as HTMLInputElement);

    const filteredOptions = useMemo(() => {
      const normalized = query.trim().toLocaleLowerCase("id-ID");
      return options.filter((option) =>
        option.toLocaleLowerCase("id-ID").includes(normalized),
      );
    }, [options, query]);

    useEffect(() => {
      const closeOnOutsideClick = (event: MouseEvent) => {
        if (!rootRef.current?.contains(event.target as Node)) {
          setIsOpen(false);
          setQuery("");
        }
      };
      document.addEventListener("mousedown", closeOnOutsideClick);
      return () => document.removeEventListener("mousedown", closeOnOutsideClick);
    }, []);

    const close = () => {
      setIsOpen(false);
      setQuery("");
      setActiveIndex(0);
    };

    const select = (option: string) => {
      onChange(option);
      close();
    };

    return (
      <div className="searchable-select" ref={rootRef}>
        <div className="select-control-wrap">
          <input
            ref={inputRef}
            id={id}
            type="text"
            role="combobox"
            className={`select-control ${invalid ? "input-error" : ""}`}
            placeholder={placeholder}
            autoComplete="off"
            disabled={disabled}
            value={isOpen ? query : value}
            title={!isOpen && value ? value : undefined}
            aria-expanded={isOpen}
            aria-controls={listboxId}
            aria-activedescendant={
              isOpen && filteredOptions[activeIndex]
                ? `${id}-option-${activeIndex}`
                : undefined
            }
            aria-autocomplete="list"
            aria-invalid={invalid || undefined}
            aria-describedby={describedBy}
            onFocus={() => {
              setIsOpen(true);
              setQuery("");
            }}
            onClick={() => setIsOpen(true)}
            onChange={(event) => {
              setQuery(event.target.value);
              setActiveIndex(0);
              setIsOpen(true);
            }}
            onKeyDown={(event) => {
              if (event.key === "ArrowDown") {
                event.preventDefault();
                setIsOpen(true);
                setActiveIndex((index) => Math.min(index + 1, filteredOptions.length - 1));
              } else if (event.key === "ArrowUp") {
                event.preventDefault();
                setActiveIndex((index) => Math.max(index - 1, 0));
              } else if (event.key === "Enter" && isOpen && filteredOptions[activeIndex]) {
                event.preventDefault();
                select(filteredOptions[activeIndex]);
              } else if (event.key === "Escape") {
                event.preventDefault();
                close();
              }
            }}
          />
          <button
            type="button"
            className="select-chevron"
            tabIndex={-1}
            aria-label={isOpen ? "Tutup pilihan distributor" : "Buka pilihan distributor"}
            disabled={disabled}
            onClick={() => {
              if (isOpen) close();
              else {
                setIsOpen(true);
                setQuery("");
                inputRef.current?.focus();
              }
            }}
          >
            <svg viewBox="0 0 20 20" fill="none" aria-hidden="true">
              <path d="m6 8 4 4 4-4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
            </svg>
          </button>
        </div>
        {isOpen ? (
          <div className="select-menu" id={listboxId} role="listbox">
            {filteredOptions.length ? (
              filteredOptions.map((option, index) => (
                <button
                  id={`${id}-option-${index}`}
                  key={option}
                  type="button"
                  role="option"
                  aria-selected={option === value}
                  className={`select-option ${index === activeIndex ? "is-active" : ""}`}
                  title={option}
                  onMouseDown={(event) => event.preventDefault()}
                  onMouseEnter={() => setActiveIndex(index)}
                  onClick={() => select(option)}
                >
                  <span>{option}</span>
                  {option === value ? <span aria-hidden="true">✓</span> : null}
                </button>
              ))
            ) : (
              <p className="select-empty">Distributor tidak ditemukan.</p>
            )}
          </div>
        ) : null}
      </div>
    );
  },
);
