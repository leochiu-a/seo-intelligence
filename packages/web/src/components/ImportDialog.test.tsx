import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import type { Node, Edge } from '@xyflow/react';
import { ImportDialog } from './ImportDialog';

// Helper to create a mock File with given content
function makeJsonFile(content: string, name = 'test.json'): File {
  return new File([content], name, { type: 'application/json' });
}

// Helper to mock FileReader for a given result
function mockFileReader(result: string) {
  const MockFileReader = function (this: {
    onload: ((e: ProgressEvent<FileReader>) => void) | null;
    readAsText: () => void;
  }) {
    this.onload = null;
    this.readAsText = () => {
      if (this.onload) {
        this.onload({ target: { result } } as ProgressEvent<FileReader>);
      }
    };
  };
  vi.stubGlobal('FileReader', MockFileReader);
}

const validJson = JSON.stringify({
  nodes: [{ id: 'n1', urlTemplate: '/test', pageCount: 1, x: 0, y: 0 }],
  edges: [],
});

describe('ImportDialog', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it('renders nothing when open=false', () => {
    render(
      <ImportDialog
        open={false}
        onClose={vi.fn()}
        onImport={vi.fn()}
      />,
    );
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('renders dialog when open=true', () => {
    render(
      <ImportDialog
        open={true}
        onClose={vi.fn()}
        onImport={vi.fn()}
      />,
    );
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByText('Import JSON')).toBeInTheDocument();
    expect(screen.getByText(/Drag & drop/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Browse files/i })).toBeInTheDocument();
  });

  it('clicking close button calls onClose', () => {
    const onClose = vi.fn();
    render(
      <ImportDialog
        open={true}
        onClose={onClose}
        onImport={vi.fn()}
      />,
    );
    fireEvent.click(screen.getByRole('button', { name: /close/i }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('dropping a valid .json file calls onImport with parsed nodes and edges', async () => {
    mockFileReader(validJson);
    const onImport = vi.fn();
    render(
      <ImportDialog
        open={true}
        onClose={vi.fn()}
        onImport={onImport}
      />,
    );
    const dropzone = screen.getByTestId('dropzone');
    const file = makeJsonFile(validJson);
    fireEvent.drop(dropzone, { dataTransfer: { files: [file] } });

    await waitFor(() => {
      expect(onImport).toHaveBeenCalledTimes(1);
    });
    const [nodes, edges] = onImport.mock.calls[0] as [Node[], Edge[]];
    expect(nodes).toHaveLength(1);
    expect(nodes[0].id).toBe('n1');
    expect(edges).toHaveLength(0);
  });

  it('dropping an invalid .json file shows error message', async () => {
    mockFileReader('{bad json}');
    render(
      <ImportDialog
        open={true}
        onClose={vi.fn()}
        onImport={vi.fn()}
      />,
    );
    const dropzone = screen.getByTestId('dropzone');
    const file = makeJsonFile('{bad json}', 'bad.json');
    fireEvent.drop(dropzone, { dataTransfer: { files: [file] } });

    await screen.findByText(/invalid/i);
  });

  it('file input change with valid JSON calls onImport', async () => {
    mockFileReader(validJson);
    const onImport = vi.fn();
    render(
      <ImportDialog
        open={true}
        onClose={vi.fn()}
        onImport={onImport}
      />,
    );
    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    const file = makeJsonFile(validJson);
    fireEvent.change(input, { target: { files: [file] } });

    await waitFor(() => {
      expect(onImport).toHaveBeenCalledTimes(1);
    });
  });
});
