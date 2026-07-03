/**
 * store/propertyStore.js
 * Zustand store untuk data properti Owner
 */

import { create } from 'zustand';

const usePropertyStore = create((set) => ({
  // ── State ──
  ownedProperties: [],        // Daftar properti milik Owner yang login
  selectedProperty: null,     // Properti yang sedang dilihat/diedit
  isLoading: false,
  errorMessage: null,

  // ── Actions ──

  setOwnedProperties: (properties) => set({ ownedProperties: properties }),

  setSelectedProperty: (property) => set({ selectedProperty: property }),

  /**
   * Tambah properti baru ke list (setelah create berhasil)
   */
  addProperty: (newProperty) =>
    set((state) => ({
      ownedProperties: [newProperty, ...state.ownedProperties],
    })),

  /**
   * Update properti di list (setelah edit berhasil)
   */
  updateProperty: (updatedProperty) =>
    set((state) => ({
      ownedProperties: state.ownedProperties.map((property) =>
        property.id === updatedProperty.id ? updatedProperty : property
      ),
      selectedProperty:
        state.selectedProperty?.id === updatedProperty.id
          ? updatedProperty
          : state.selectedProperty,
    })),

  /**
   * Hapus properti dari list (soft delete)
   */
  removeProperty: (propertyId) =>
    set((state) => ({
      ownedProperties: state.ownedProperties.filter((p) => p.id !== propertyId),
      selectedProperty:
        state.selectedProperty?.id === propertyId ? null : state.selectedProperty,
    })),

  setIsLoading: (isLoading) => set({ isLoading }),
  setErrorMessage: (errorMessage) => set({ errorMessage }),
  clearError: () => set({ errorMessage: null }),
}));

export default usePropertyStore;
