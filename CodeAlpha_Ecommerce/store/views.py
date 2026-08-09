from django.shortcuts import render, get_object_or_404
from .models import Product, Category


def product_list(request):
    category_id = request.GET.get("category")
    categories = Category.objects.all().order_by("name")

    if category_id:
        products = (
            Product.objects.filter(category_id=category_id)
            .select_related("category")
            .order_by("-created_at")
        )
        selected_category = Category.objects.filter(pk=category_id).first()
    else:
        products = (
            Product.objects.select_related("category")
            .order_by("category__name", "-created_at")
        )
        selected_category = None

    return render(
        request,
        "store/product_list.html",
        {
            "products": products,
            "categories": categories,
            "selected_category": selected_category,
        },
    )


def product_detail(request, pk):
    product = get_object_or_404(Product, pk=pk)
    recommended_products = (
        Product.objects.filter(category=product.category)
        .exclude(pk=product.pk)
        .order_by("-created_at")[:6]
    )
    return render(
        request,
        "store/product_detail.html",
        {
            "product": product,
            "recommended_products": recommended_products,
        },
    )
