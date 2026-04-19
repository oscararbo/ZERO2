def parse_pagination(request, default_page_size=20, max_page_size=50):
    try:
        page = int(request.query_params.get('page', 1))
    except (TypeError, ValueError):
        page = 1

    try:
        page_size = int(request.query_params.get('page_size', default_page_size))
    except (TypeError, ValueError):
        page_size = default_page_size

    page = max(1, page)
    page_size = max(1, min(page_size, max_page_size))
    offset = (page - 1) * page_size
    return page, page_size, offset


def paginated_response(queryset, serializer_cls, page, page_size, offset, serializer_kwargs=None, extra=None):
    total = queryset.count()
    items_qs = queryset[offset: offset + page_size]
    kwargs = serializer_kwargs or {}
    serializer = serializer_cls(items_qs, many=True, **kwargs)
    total_pages = (total + page_size - 1) // page_size if page_size else 1
    next_page = page + 1 if (offset + page_size) < total else None
    previous_page = page - 1 if page > 1 else None
    payload = {
        'items': serializer.data,
        'page': page,
        'page_size': page_size,
        'total': total,
        'total_pages': total_pages,
        'has_next': (offset + page_size) < total,
        'next_page': next_page,
        'previous_page': previous_page,
    }
    if extra:
        payload.update(extra)
    return payload
