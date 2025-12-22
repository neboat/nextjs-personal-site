'use client'

import * as React from "react"
import CilkBookHighlight from "@/components/cilkbook-highlight"
import { copyIcon, copiedIcon } from "@/components/copybtn";

/** Paste richly formatted text.
 *
 * @param {string} rich - the text formatted as HTML
 * @param {string} plain - a plain text fallback
 */
async function pasteRich(rich, plain) {
    if (typeof ClipboardItem !== "undefined") {
        // Shiny new Clipboard API, not fully supported in Firefox.
        // https://developer.mozilla.org/en-US/docs/Web/API/Clipboard_API#browser_compatibility
        const html = new Blob([rich], { type: "text/html" });
        const text = new Blob([plain], { type: "text/plain" });
        const data = new ClipboardItem({ "text/html": html, "text/plain": text });
        await navigator.clipboard.write([data]);
    } else {
        // Fallback using the deprecated `document.execCommand`.
        // https://developer.mozilla.org/en-US/docs/Web/API/Document/execCommand#browser_compatibility
        const cb = e => {
            e.clipboardData.setData("text/html", rich);
            e.clipboardData.setData("text/plain", plain);
            e.preventDefault();
        };
        document.addEventListener("copy", cb);
        document.execCommand("copy");
        document.removeEventListener("copy", cb);
    }
}

// Default code example to show when page is loaded.
const InputCode = [
`int64_t fib(int64_t n) {
  if (n < 2) return n;
  int64_t x, y;
  cilk_scope {
    x = cilk_spawn fib(n-1);
    y = fib(n-2);
  }
  return x + y;
}`,

`template <typename T>
void vecadd(std::vector<T> &out, const std::vector<T> &in) {
  cilk_for (auto [x, y] : std::views::zip(out, in)) {
    x += y;
  }
}`,

`Scalar sum_product(const Scalar *A, const Scalar *B,
                   const Scalar *C, size_t N) {
    Scalar cilk_reducer(id_fn, reducer_fn) sum = 0;
    cilk_for (size_t i = 0; i < N; i++) {
        Scalar product = A[i] * B[i] * C[i];
        sum += product;
    }
    return sum;
}`,

`template <typename T> void sample_qsort(T* begin, T* end) {
  if (end - begin < BASE_CASE_LENGTH) {
    std::sort(begin, end);  // Base case: Serial sort
  } else {
    --end;  // Exclude last element (pivot) from partition
    T* middle = std::partition(begin, end, [pivot=*end](T a) { return a < pivot; });
    std::swap(*end, *middle);  // Move pivot to middle
    cilk_scope {
      cilk_spawn sample_qsort(begin, middle);
      sample_qsort(++middle, ++end);  // Exclude pivot and restore end
    }
  }
}`,

`namespace cilk {
template <typename T> static void zero(void *v) {
    *static_cast<T *>(v) = static_cast<T>(0);
}
template <typename T> static void plus(void *l, void *r) {
    *static_cast<T *>(l) += *static_cast<T *>(r);
}
template <typename T> using opadd_reducer = T cilk_reducer(zero<T>, plus<T>);
} // namespace cilk`,

`template <typename A> static void init(void *view) {
    new(view) A;
}
template <typename A> static void reduce(void *left, void *right) {
    if (std::is_destructible<A>::value)
        static_cast<A *>(right)->~A();
}
template <typename A>
using holder = A cilk_reducer(init<A>, reduce<A>);`,

`void down_sweep(V &prefix) {
  if (!l_child && !r_child) {
    // At a leaf, broadcast the prefix over the range
    cilk_for (ssize_t i = r.start; i <= r.end; ++i) {
      value_reduce_to_right(prefix, &array[i]);
      leaf_reduce(array[i], i);
    }
  } else {
    cilk_scope {
      assert(l_child && r_child);
      // Add the prefix to the end of l_child's range, to compute the
      // prefix for r_child.
      V r_prefix = internal_reduce(&prefix, &l_child->sum);
      // Recursively down-sweep l_child and r_child in parallel.
      cilk_spawn l_child->down_sweep(prefix);
      r_child->down_sweep(r_prefix);
    }
    delete l_child;
    delete r_child;
  }
}`,

`template <typename T>
using Bag_reducer = Bag<T> cilk_reducer(Bag<T>::identity, Bag<T>::reduce);
void Graph::pbfs_walk_Bag(Bag<int> &b, Bag_reducer<int> &next,
                          int newdistance, int distances[]) const {
  if (b.getFill() > 0) {
    // Split the bag and recurse
    Pennant<int> *p = nullptr;
    b.split(&p);
    cilk_spawn pbfs_walk_Pennant(p, next, newdistance, distances);
    pbfs_walk_Bag(b, next, newdistance, distances);
  } else {
    // Process the filling array
    int *n = b.getFilling();
    int fillSize = b.getFillingSize();
    int extraFill = fillSize % THRESHOLD;
    cilk_spawn pbfs_proc_Node(n + fillSize - extraFill, extraFill, next,
                              newdistance, distances, nodes, edges);
    cilk_for (int i = 0; i < fillSize - extraFill; i += THRESHOLD)
      pbfs_proc_Node(n + i, THRESHOLD, next, newdistance, distances,
                     nodes, edges);
  }
}`,

`void queens(BoardList* board_list, board_t cur_board, row_t row, row_t down,
            row_t left, row_t right) {
  if (row == N) {
    // A solution to 8 queens!
    append_node(board_list, cur_board);
  } else {
    int open_cols_bitmap = BITMASK & ~(down | left | right);

    cilk_scope while (open_cols_bitmap != 0) {
      int bit = -open_cols_bitmap & open_cols_bitmap;
      int col = log2(bit);
      open_cols_bitmap ^= bit;

      // Recurse! This can be parallelized.
      cilk_spawn queens(board_list, cur_board | board_bitmask(row, col), row + 1,
                        down | bit, (left | bit) << 1, (right | bit) >> 1);
    }
  }
}`,

`unsigned char *cilk_mandelbrot(double x0, double y0, double x1, double y1,
                               int width, int height, int max_depth) {
  double xstep = (x1 - x0) / width;
  double ystep = (y1 - y0) / height;
  unsigned char *output = static_cast<unsigned char *>(
      aligned_alloc(64, width * height * sizeof(unsigned char)));
  // Traverse the sample space in equally spaced steps with width * height
  // samples
  cilk_for (int j = 0; j < height; ++j) {
    cilk_for (int i = 0; i < width; ++i) {
      double z_real = x0 + i * xstep;
      double z_imaginary = y0 + j * ystep;
      double c_real = z_real;
      double c_imaginary = z_imaginary;
      int depth = 0;
      // Figures out how many recurrences are required before divergence, up to
      // max_depth
      while (depth < max_depth) {
        if (z_real * z_real + z_imaginary * z_imaginary > 4.0)
          break; // Escape from a circle of radius 2
        double temp_real = z_real * z_real - z_imaginary * z_imaginary;
        double temp_imaginary = 2.0 * z_real * z_imaginary;
        z_real = c_real + temp_real;
        z_imaginary = c_imaginary + temp_imaginary;
        ++depth;
      }
      output[j * width + i] = static_cast<unsigned char>(
          static_cast<double>(depth) / max_depth * 255);
    }
  }
  return output;
}`,
]

// const Tooltip = ({ children, ...rest }) => {
//     // const [open, setOpen] = React.useState(false)
//     // const handler = React.useCallback((e) => {
//     //     console.log("keydown", e.key)
//     //     if (e.key === "Escape")
//     //         setOpen(false)
//     // })
//     // window.useEventListener("keydown", handler);
//     return (
//         <span className='tooltip rounded-lg shadow-lg p-1 bg-gray-600 text-xs text-white -mt-7' {...rest} >{children}</span>
//     )
// }

export const CodeInputOutput = () => {
    const [formData, setFormData] = React.useState({
        inputCode: '',
        inputCodeLang: "cilkcpp",
        inputCodeStyle: "cilkbook"
    })
    const [isCopied, setIsCopied] = React.useState(false)

    const handleInput = (e) => {
        const fieldName = e.target.name
        const fieldValue = e.target.value
        setFormData((prevState) => ({
            ...prevState,
            [fieldName]: fieldValue
        }))
    }

    React.useEffect(() => {
        // This runs only on the client after the component mounts
        setFormData(prevState => ({
            ...prevState,
            inputCode: InputCode[Math.floor(Math.random() * InputCode.length)]}));
    }, [])

    React.useEffect(() => {
        const code = formData.inputCode
        const lang = formData.inputCodeLang
        const style = formData.inputCodeStyle
        const div = document.getElementById("outputCode")
        async function getHighlighted(code, lang, style) {
            div.innerHTML = await CilkBookHighlight(code, lang, style)
        }
        getHighlighted(code, lang, style)
    }, [formData])

    // Action for copying formatted output to the clipboard.
    const copyFormattedToClipboard = () => {
        const str = document.getElementById('outputCode').innerHTML
        // Replace newlines with <br> in HTML
        pasteRich(str.replace(/(?:\r\n|\r|\n)/g, '<br>'), str)
        setIsCopied(true)
        setTimeout(() => setIsCopied(false), 1000)
    }

    const handleSubmit = (e) => {
        e.preventDefault()
    }

    return (
        <form className="grid grid-flow-row lg:grid-cols-2 lg:gap-x-4" onSubmit={handleSubmit}>
            <div className="flex">
                <label htmlFor="inputCode" className="block py-1 text-md">Enter code to highlight:</label>
            </div>
            <textarea className={"flex lg:order-2 mb-2 lg:mb-0 font-mono p-2.5 text-sm text-gray-950 dark:text-gray-50 bg-neutral-100 dark:bg-neutral-800 rounded-xs border border-neutral-300 dark:border-neutral-600 focus:ring-blue-500 focus:border-blue-500 whitespace-pre overflow-x-auto"}
                name="inputCode" id="inputCode"
                onChange={handleInput}
                rows={formData.inputCode.split('\n').length}
                value={formData.inputCode}></textarea>
            <div className="flex items-end gap-x-2">
                <div className="block has-tooltip">
                    {/* <Tooltip>Copy formatted text to clipboard</Tooltip> */}
                    <button className="text-md bg-blue-500 hover:bg-blue-700 dark:bg-blue-700 dark:hover:bg-blue-500 text-white px-3 border border-blue-700 rounded-xs" onClick={copyFormattedToClipboard}>
                    <span className="align-baseline">{isCopied ? copiedIcon : copyIcon} Copy</span>
                    </button>
                </div>
                <div className="flex flex-wrap gap-x-2">
                    <div className="table-cell whitespace-nowrap has-tooltip">
                        <label htmlFor="inputCodeLang" className="text-md mr-1">Language:</label>
                        {/* <Tooltip>Select language</Tooltip> */}
                        <select className="text-md rounded-xs px-1 border bg-neutral-100 dark:bg-neutral-800 border-neutral-300 dark:border-neutral-600 focus:ring-blue-500 focus:border-blue-500" name="inputCodeLang" id="inputCodeLang" onChange={handleInput} value={formData.inputCodeLang}>
                            <option value="cilkcpp">Cilk/C++</option>
                            <option value="cilkc">Cilk/C</option>
                            <option value="cpp">C++</option>
                            <option value="c">C</option>
                        </select>
                    </div>
                    <div className="table-cell whitespace-nowrap has-tooltip">
                        <label htmlFor="inputCodeStyle" className="text-md mr-1">Theme:</label>
                        {/* <Tooltip>Select style</Tooltip> */}
                        <select className="text-md rounded-xs px-1 border bg-neutral-100 dark:bg-neutral-800 border-neutral-300 dark:border-neutral-600 focus:ring-blue-500 focus:border-blue-500" name="inputCodeStyle" id="inputCodeStyle" onChange={handleInput} value={formData.inputCodeStyle}>
                            <option value="cilkbook">Cilkbook</option>
                            <option value="slack-dark">Slack dark</option>
                            <option value="slack-ochin">Slack light</option>
                            <option value="solarized-dark">Solarized dark</option>
                            <option value="solarized-light">Solarized light</option>
                        </select>
                    </div>
                </div>
            </div>
            <div id="outputCode" className="not-prose flex lg:order-2 border border-neutral-300 dark:border-neutral-600 bg-neutral-100 dark:bg-neutral-800 rounded-xs overflow-x-auto">
                Loading highlighter...
            </div>
        </form>
    )
}
