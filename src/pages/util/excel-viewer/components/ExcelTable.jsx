import useTableState from '../hooks/useTableState';
import { exportToCsv } from '../utils/tableUtils';
import ExcelToolbar from './ExcelToolbar';
import TableHeader from './TableHeader';
import TableBody from './TableBody';
import TableFooter from './TableFooter';

export default function ExcelTable({ data, cellColors }) {
    const {
        headers,
        allRows,
        processedRows,
        processedOrigIndices,
        search,
        setSearch,
        pinnedCount,
        addPin,
        removePin,
        resetPin,
        visibleCols,
        sort,
        resize,
        filters,
        visibility,
        summary,
        colorSortDir,
        toggleColorSort,
        colorFilter,
        toggleColorFilter,
        clearColorFilter,
        availableColors,
        hasColorFeatures,
        selectedRows,
        toggleSelectRow,
        selectAllVisible,
        deselectAll,
        isSelected,
        deleteSelected,
    } = useTableState(data, cellColors);

    if (data.length === 0) {
        return (
            <p className="py-8 text-center text-slate-500 dark:text-slate-400">
                데이터가 없습니다.
            </p>
        );
    }

    const handleExportCsv = () => {
        const exportHeaders = visibleCols.map(
            (i) => (headers[i] !== '' ? String(headers[i]) : `Column ${i + 1}`),
        );
        const exportRows = processedRows.map((row) =>
            visibleCols.map((i) => (i < row.length ? row[i] : '')),
        );
        exportToCsv(exportHeaders, exportRows, 'export.csv');
    };

    return (
        <div>
            <ExcelToolbar
                search={search}
                onSearchChange={setSearch}
                totalRows={allRows.length}
                filteredCount={processedRows.length}
                hasActiveSearch={!!search.trim()}
                onExportCsv={handleExportCsv}
                headers={headers}
                hiddenCols={visibility.hiddenCols}
                onToggleColumn={visibility.toggleColumn}
                onShowAllColumns={visibility.showAll}
                onHideAllColumns={visibility.hideAll}
                summaryModeLabel={summary.modeLabel}
                onCycleSummary={summary.cycleMode}
                pinnedCount={pinnedCount}
                onAddPin={addPin}
                onRemovePin={removePin}
                onResetPin={resetPin}
                maxPin={visibleCols.length}
                hasAnyFilter={filters.hasAnyFilter}
                onClearAllFilters={filters.clearAllFilters}
                colorSortDir={colorSortDir}
                onToggleColorSort={toggleColorSort}
                colorFilter={colorFilter}
                onToggleColorFilter={toggleColorFilter}
                onClearColorFilter={clearColorFilter}
                availableColors={availableColors}
                hasColorFeatures={hasColorFeatures}
                selectedCount={selectedRows.size}
                onDeleteSelected={deleteSelected}
                onDeselectAll={deselectAll}
            />

            <div className="max-h-[calc(100vh-350px)] overflow-auto rounded-lg border border-slate-200 dark:border-slate-700">
                <table
                    data-excel-table
                    className="w-full border-collapse text-sm"
                    style={{ tableLayout: 'fixed' }}
                >
                    <TableHeader
                        headers={headers}
                        visibleCols={visibleCols}
                        sortCol={sort.sortCol}
                        sortDir={sort.sortDir}
                        onToggleSort={sort.toggleSort}
                        getWidth={resize.getWidth}
                        onResizeMouseDown={resize.handleMouseDown}
                        isFiltered={filters.isFiltered}
                        uniqueValuesMap={filters.uniqueValuesMap}
                        filters={filters.filters}
                        onApplyFilter={filters.applyFilter}
                        pinnedCount={pinnedCount}
                        cellColors={cellColors}
                        allSelected={selectedRows.size > 0 && selectedRows.size === processedRows.length}
                        someSelected={selectedRows.size > 0 && selectedRows.size < processedRows.length}
                        onSelectAll={selectAllVisible}
                        onDeselectAll={deselectAll}
                    />

                    <TableBody
                        processedRows={processedRows}
                        processedOrigIndices={processedOrigIndices}
                        visibleCols={visibleCols}
                        getWidth={resize.getWidth}
                        pinnedCount={pinnedCount}
                        cellColors={cellColors}
                        isSelected={isSelected}
                        onToggleSelect={toggleSelectRow}
                    />

                    <TableFooter
                        modeLabel={summary.modeLabel}
                        summaryValues={summary.summaryValues}
                        visibleCols={visibleCols}
                        getWidth={resize.getWidth}
                        pinnedCount={pinnedCount}
                    />
                </table>
            </div>
        </div>
    );
}
