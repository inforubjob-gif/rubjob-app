import { 
  collection, 
  addDoc, 
  updateDoc, 
  doc, 
  getDoc, 
  getDocs, 
  query, 
  where, 
  orderBy,
  Timestamp,
  serverTimestamp 
} from "firebase/firestore";
import { db } from "./firebase";
import type { Order, OrderStatus } from "@/types";

const ORDERS_COLLECTION = "orders";

export const orderService = {
  /**
   * Create a new order in Firestore
   */
  async createOrder(orderData: Omit<Order, "id" | "createdAt" | "updatedAt">) {
    try {
      const docRef = await addDoc(collection(db, ORDERS_COLLECTION), {
        ...orderData,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      return docRef.id;
    } catch (error) {
      console.error("Error creating order:", error);
      throw error;
    }
  },

  /**
   * Fetch all orders for a specific user
   */
  async getUserOrders(userId: string) {
    try {
      const q = query(
        collection(db, ORDERS_COLLECTION),
        where("userId", "==", userId),
        orderBy("createdAt", "desc")
      );
      const querySnapshot = await getDocs(q);
      return querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        // Convert Firestore timestamps back to strings for the frontend
        createdAt: (doc.data().createdAt as Timestamp)?.toDate().toISOString(),
        updatedAt: (doc.data().updatedAt as Timestamp)?.toDate().toISOString(),
      })) as Order[];
    } catch (error) {
      console.error("Error fetching user orders:", error);
      return [];
    }
  },

  /**
   * Fetch a single order by ID
   */
  async getOrderById(orderId: string) {
    try {
      const docRef = doc(db, ORDERS_COLLECTION, orderId);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        const data = docSnap.data();
        return {
          id: docSnap.id,
          ...data,
          createdAt: (data.createdAt as Timestamp)?.toDate().toISOString(),
          updatedAt: (data.updatedAt as Timestamp)?.toDate().toISOString(),
        } as Order;
      }
      return null;
    } catch (error) {
      console.error("Error fetching order:", error);
      return null;
    }
  },

  /**
   * Update order status
   */
  async updateOrderStatus(orderId: string, status: OrderStatus) {
    try {
      const docRef = doc(db, ORDERS_COLLECTION, orderId);
      await updateDoc(docRef, {
        status,
        updatedAt: serverTimestamp(),
      });
      return true;
    } catch (error) {
      console.error("Error updating order status:", error);
      return false;
    }
  },

  /**
   * Admin: Fetch all orders (for the dashboard)
   */
  async getAllOrders() {
    try {
      const q = query(collection(db, ORDERS_COLLECTION), orderBy("createdAt", "desc"));
      const querySnapshot = await getDocs(q);
      return querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: (doc.data().createdAt as Timestamp)?.toDate().toISOString(),
        updatedAt: (doc.data().updatedAt as Timestamp)?.toDate().toISOString(),
      })) as Order[];
    } catch (error) {
      console.error("Error fetching all orders:", error);
      return [];
    }
  }
};
