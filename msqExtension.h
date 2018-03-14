/*
 ***** BEGIN LICENSE BLOCK *****
 * This file is part of ExQuilla by Mesquilla.
 *
 * Copyright 2010 R. Kent James
 *
 * All Rights Reserved
 *
 * ***** END LICENSE BLOCK *****
 */
// dummy 2014-02-06

#ifndef _msqExtension_h__
#define _msqExtension_h__

// Contains values of various strings and constants used by exchange web services

// extension id
#define EXTENSION_ID "exquilla@mesquilla.com"

#if !defined(MSQ_MOZ_17) && !defined(MSQ_MOZ_24) && !defined(MSQ_MOZ_28)
#ifndef __PRUNICHAR__
#define __PRUNICHAR__
typedef char16_t PRUnichar;
#endif
#endif
#include "prtypes.h"

#undef PRBool
#define PRBool bool

#endif /* _msqEwsConstants_h__ */
