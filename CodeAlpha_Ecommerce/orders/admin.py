from django.contrib import admin
from .models import Cart, CartItem, Order, OrderItem


class OrderItemInline(admin.TabularInline):
    model = OrderItem
    extra = 0
    readonly_fields = ["product", "quantity", "price"]


@admin.register(Order)
class OrderAdmin(admin.ModelAdmin):
    list_display = ["id", "user", "total_amount", "status", "created_at"]
    list_editable = ["status"]
    list_filter = ["status", "created_at"]
    search_fields = ["user__username"]
    inlines = [OrderItemInline]


admin.site.register(Cart)
admin.site.register(CartItem)
